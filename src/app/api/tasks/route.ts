import { NextRequest, NextResponse } from 'next/server';
import { getDb, Task } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET all tasks
export async function GET() {
  try {
    const db = getDb();
    const tasks = db.prepare(`
      SELECT t.*, a.name as agent_name
      FROM tasks t
      LEFT JOIN agents a ON t.assigned_agent_id = a.id
      ORDER BY t.created_at DESC
    `).all();

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST create new task
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();

    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    const status = body.status || 'backlog';

    const stmt = db.prepare(`
      INSERT INTO tasks (id, title, description, status, priority, assigned_agent_id, tags, due_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      body.title,
      body.description || null,
      status,
      body.priority || 'medium',
      body.assigned_agent_id || null,
      body.tags ? JSON.stringify(body.tags) : null,
      body.due_date || null,
      now,
      now
    );

    // Log activity with task_id and task_status
    const activityStmt = db.prepare(`
      INSERT INTO activity_log (event_type, agent_id, task_id, task_status, summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    activityStmt.run('task_created', body.assigned_agent_id || null, id, status, `Task created: ${body.title}`, now);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// PUT update task
export async function PUT(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const now = Math.floor(Date.now() / 1000);

    if (!body.id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (body.title !== undefined) { updates.push('title = ?'); values.push(body.title); }
    if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
    if (body.status !== undefined) {
      updates.push('status = ?');
      values.push(body.status);
      if (body.status === 'completed') {
        updates.push('completed_at = ?');
        values.push(now);
      }
    }
    if (body.priority !== undefined) { updates.push('priority = ?'); values.push(body.priority); }
    if (body.assigned_agent_id !== undefined) { updates.push('assigned_agent_id = ?'); values.push(body.assigned_agent_id); }
    if (body.tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(body.tags)); }
    if (body.due_date !== undefined) { updates.push('due_date = ?'); values.push(body.due_date); }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(body.id);

    const stmt = db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    // Get updated task for activity log
    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(body.id) as Task;

    // Determine event type and summary based on what changed
    const isStatusMove = body.previous_status && body.status && body.previous_status !== body.status;
    const eventType = isStatusMove ? 'task_moved' : 'task_updated';

    // Status labels for readable output
    const statusLabels: Record<string, string> = {
      recurring: 'Recurring',
      backlog: 'Backlog',
      in_progress: 'In Progress',
      review: 'Review',
      completed: 'Completed',
    };

    let summary: string;
    if (isStatusMove) {
      const fromLabel = statusLabels[body.previous_status] || body.previous_status;
      const toLabel = statusLabels[body.status] || body.status;
      summary = `${updatedTask?.title || 'Task'}: ${fromLabel} → ${toLabel}`;
    } else {
      summary = `Task updated: ${updatedTask?.title || body.title || body.id}`;
    }

    // Log activity with task_id, task_status, and metadata for movements
    const metadata = isStatusMove
      ? JSON.stringify({ from: body.previous_status, to: body.status })
      : '{}';

    const activityStmt = db.prepare(`
      INSERT INTO activity_log (event_type, agent_id, task_id, task_status, summary, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    activityStmt.run(
      eventType,
      updatedTask?.assigned_agent_id || null,
      body.id,
      updatedTask?.status || body.status,
      summary,
      metadata,
      now
    );

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE task
export async function DELETE(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;

    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

    // Log activity with task info (task_id set to null since deleted)
    const now = Math.floor(Date.now() / 1000);
    const activityStmt = db.prepare(`
      INSERT INTO activity_log (event_type, agent_id, task_id, task_status, summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    activityStmt.run(
      'task_deleted',
      task?.assigned_agent_id || null,
      null, // task_id null since deleted
      task?.status || null,
      `Task deleted: ${task?.title || id}`,
      now
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
