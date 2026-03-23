import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface ChatMessage {
  id: number;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: number;
}

interface Memory {
  id: number;
  chat_id: string;
  topic_key: string | null;
  content: string;
  sector: 'semantic' | 'episodic';
  salience: number;
  created_at: number;
  accessed_at: number;
}

// Normalize timestamps (some are in milliseconds, some in seconds)
function normalizeTimestamp(ts: number): number {
  // If timestamp is in milliseconds (> year 2100 in seconds), convert to seconds
  if (ts > 4000000000) {
    return Math.floor(ts / 1000);
  }
  return ts;
}

// GET messages and memories organized by date
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const chatId = searchParams.get('chat_id');

    let messages: ChatMessage[] = [];
    let memories: Memory[] = [];

    // Fetch chat messages
    if (type === 'messages' || type === 'all') {
      let query = 'SELECT * FROM chat_messages';
      const conditions: string[] = [];
      const params: any[] = [];

      if (chatId) {
        conditions.push('chat_id = ?');
        params.push(chatId);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      query += ' ORDER BY created_at DESC LIMIT 500';

      messages = db.prepare(query).all(...params) as ChatMessage[];
    }

    // Fetch memories
    if (type === 'memories' || type === 'all') {
      let query = 'SELECT * FROM memories';
      const conditions: string[] = [];
      const params: any[] = [];

      if (chatId) {
        conditions.push('chat_id = ?');
        params.push(chatId);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      query += ' ORDER BY created_at DESC LIMIT 500';

      memories = db.prepare(query).all(...params) as Memory[];
    }

    // Get unique chat IDs from both tables
    const chatIds = db.prepare(`
      SELECT DISTINCT chat_id FROM (
        SELECT chat_id FROM chat_messages
        UNION
        SELECT chat_id FROM memories
      ) ORDER BY chat_id
    `).all() as { chat_id: string }[];

    return NextResponse.json({
      messages,
      memories,
      chatIds: chatIds.map(c => c.chat_id),
    });
  } catch (error) {
    console.error('Error fetching memory:', error);
    return NextResponse.json({ error: 'Failed to fetch memory' }, { status: 500 });
  }
}

// POST - Get organized data
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { action } = body;

    if (action === 'get_days') {
      // Get all days from both chat_messages and memories
      // Memories use different timestamp formats so we handle both
      const days = db.prepare(`
        SELECT day, SUM(count) as message_count, MIN(first_ts) as first_message, MAX(last_ts) as last_message
        FROM (
          SELECT
            date(datetime(created_at, 'unixepoch')) as day,
            COUNT(*) as count,
            MIN(created_at) as first_ts,
            MAX(created_at) as last_ts
          FROM chat_messages
          GROUP BY day

          UNION ALL

          SELECT
            CASE
              WHEN created_at > 4000000000 THEN date(datetime(created_at / 1000, 'unixepoch'))
              ELSE date(datetime(created_at, 'unixepoch'))
            END as day,
            COUNT(*) as count,
            MIN(CASE WHEN created_at > 4000000000 THEN created_at / 1000 ELSE created_at END) as first_ts,
            MAX(CASE WHEN created_at > 4000000000 THEN created_at / 1000 ELSE created_at END) as last_ts
          FROM memories
          WHERE chat_id NOT IN ('system', 'default')
          GROUP BY day
        )
        GROUP BY day
        ORDER BY day DESC
      `).all();

      return NextResponse.json({ days });
    }

    if (action === 'get_day_data') {
      const { date } = body; // Format: YYYY-MM-DD

      // Get chat messages for that day
      const messages = db.prepare(`
        SELECT * FROM chat_messages
        WHERE date(datetime(created_at, 'unixepoch')) = ?
        ORDER BY chat_id, created_at ASC
      `).all(date) as ChatMessage[];

      // Get memories for that day (handling both timestamp formats)
      const memories = db.prepare(`
        SELECT * FROM memories
        WHERE (
          (created_at > 4000000000 AND date(datetime(created_at / 1000, 'unixepoch')) = ?)
          OR
          (created_at <= 4000000000 AND date(datetime(created_at, 'unixepoch')) = ?)
        )
        AND chat_id NOT IN ('system', 'default')
        ORDER BY chat_id, created_at ASC
      `).all(date, date) as Memory[];

      // Group messages by chat_id
      const chatConversations: Record<string, ChatMessage[]> = {};
      messages.forEach(msg => {
        if (!chatConversations[msg.chat_id]) {
          chatConversations[msg.chat_id] = [];
        }
        chatConversations[msg.chat_id].push(msg);
      });

      // Group memories by chat_id and normalize timestamps
      const memoryConversations: Record<string, Memory[]> = {};
      memories.forEach(mem => {
        const normalizedMem = {
          ...mem,
          created_at: normalizeTimestamp(mem.created_at),
          accessed_at: normalizeTimestamp(mem.accessed_at),
        };
        if (!memoryConversations[mem.chat_id]) {
          memoryConversations[mem.chat_id] = [];
        }
        memoryConversations[mem.chat_id].push(normalizedMem);
      });

      return NextResponse.json({
        chatConversations,
        memoryConversations,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
