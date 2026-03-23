import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET all agents
export async function GET() {
  try {
    const db = getDb();
    const agents = db.prepare(`
      SELECT
        a.id,
        a.name,
        a.description,
        a.system_prompt,
        a.model,
        a.is_active,
        a.created_at,
        a.updated_at,
        (SELECT COUNT(*) FROM tasks t WHERE t.assigned_agent_id = a.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.assigned_agent_id = a.id AND t.status = 'completed') as completed_count
      FROM agents a
      ORDER BY a.name
    `).all();

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

// POST create new agent
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Agent name is required' }, { status: 400 });
    }

    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      INSERT INTO agents (id, name, description, system_prompt, model, tools, disallowed_tools, is_default, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      body.name,
      body.description || null,
      body.system_prompt || null,
      body.model || 'claude',
      body.tools ? JSON.stringify(body.tools) : null,
      body.disallowed_tools ? JSON.stringify(body.disallowed_tools) : null,
      body.is_default ? 1 : 0,
      1, // is_active
      now,
      now
    );

    // Log activity
    const activityStmt = db.prepare(`
      INSERT INTO activity_log (event_type, agent_id, summary, created_at)
      VALUES (?, ?, ?, ?)
    `);
    activityStmt.run('agent_created', id, `Agent created: ${body.name}`, now);

    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}

// PUT update agent
export async function PUT(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const now = Math.floor(Date.now() / 1000);

    if (!body.id) {
      return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) { updates.push('name = ?'); values.push(body.name); }
    if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
    if (body.system_prompt !== undefined) { updates.push('system_prompt = ?'); values.push(body.system_prompt); }
    if (body.model !== undefined) { updates.push('model = ?'); values.push(body.model); }
    if (body.is_active !== undefined) { updates.push('is_active = ?'); values.push(body.is_active ? 1 : 0); }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(body.id);

    const stmt = db.prepare(`UPDATE agents SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    // Log activity
    const activityStmt = db.prepare(`
      INSERT INTO activity_log (event_type, agent_id, summary, created_at)
      VALUES (?, ?, ?, ?)
    `);
    activityStmt.run('agent_updated', body.id, `Agent updated: ${body.name || body.id}`, now);

    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(body.id);

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

// DELETE agent
export async function DELETE(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });
    }

    const agent = db.prepare('SELECT name FROM agents WHERE id = ?').get(id) as { name: string } | undefined;

    // Soft delete - just set is_active to 0
    db.prepare('UPDATE agents SET is_active = 0, updated_at = ? WHERE id = ?').run(Math.floor(Date.now() / 1000), id);

    // Unassign tasks from this agent
    db.prepare('UPDATE tasks SET assigned_agent_id = NULL WHERE assigned_agent_id = ?').run(id);

    // Log activity
    const now = Math.floor(Date.now() / 1000);
    const activityStmt = db.prepare(`
      INSERT INTO activity_log (event_type, summary, created_at)
      VALUES (?, ?, ?)
    `);
    activityStmt.run('agent_deleted', `Agent deactivated: ${agent?.name || id}`, now);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}
