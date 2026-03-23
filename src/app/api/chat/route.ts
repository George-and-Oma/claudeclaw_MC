import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: number;
}

// Ensure chat table exists
function ensureChatTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS web_chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_web_chat_session ON web_chat_messages(session_id)
  `);
}

// GET messages for a session
export async function GET(request: NextRequest) {
  try {
    ensureChatTable();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id') || 'default';

    const messages = db.prepare(`
      SELECT id, role, content, created_at
      FROM web_chat_messages
      WHERE session_id = ?
      ORDER BY created_at ASC
      LIMIT 100
    `).all(sessionId) as Message[];

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST send message and get response
export async function POST(request: NextRequest) {
  try {
    ensureChatTable();
    const db = getDb();
    const body = await request.json();
    const { message, session_id = 'default' } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    const userMsgId = uuidv4();

    // Save user message
    db.prepare(`
      INSERT INTO web_chat_messages (id, session_id, role, content, created_at)
      VALUES (?, ?, 'user', ?, ?)
    `).run(userMsgId, session_id, message, now);

    // Call claude CLI to get response
    const response = await callClaude(message, session_id);

    const assistantMsgId = uuidv4();
    const responseTime = Math.floor(Date.now() / 1000);

    // Save assistant response
    db.prepare(`
      INSERT INTO web_chat_messages (id, session_id, role, content, created_at)
      VALUES (?, ?, 'assistant', ?, ?)
    `).run(assistantMsgId, session_id, response, responseTime);

    // Log activity
    db.prepare(`
      INSERT INTO activity_log (event_type, entity_type, entity_id, metadata, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('chat_message', 'chat', session_id, JSON.stringify({ preview: message.slice(0, 50) }), now);

    return NextResponse.json({
      success: true,
      response,
      message_id: assistantMsgId,
    });
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}

// DELETE clear session
export async function DELETE(request: NextRequest) {
  try {
    ensureChatTable();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id') || 'default';

    db.prepare('DELETE FROM web_chat_messages WHERE session_id = ?').run(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing session:', error);
    return NextResponse.json({ error: 'Failed to clear session' }, { status: 500 });
  }
}

async function callClaude(message: string, sessionId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const claudeProcess = spawn('claude', [
      '--print',
      '--dangerously-skip-permissions',
      message
    ], {
      cwd: '/home/dg/claudeclaw',
      env: {
        ...process.env,
        CLAUDE_SESSION_ID: `web_${sessionId}`,
      },
      timeout: 120000,
    });

    let output = '';
    let errorOutput = '';

    claudeProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    claudeProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    claudeProcess.on('close', (code) => {
      if (code === 0 || output.trim()) {
        resolve(output.trim() || 'Task completed.');
      } else {
        console.error('Claude error:', errorOutput);
        resolve('Something went wrong. Try again.');
      }
    });

    claudeProcess.on('error', (err) => {
      console.error('Claude spawn error:', err);
      resolve('Failed to connect to Claude. Try again.');
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      claudeProcess.kill();
      resolve('Request timed out. Try a simpler task.');
    }, 120000);
  });
}
