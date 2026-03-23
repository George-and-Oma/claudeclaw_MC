import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import cronParser from 'cron-parser';

// GET all scheduled tasks
export async function GET() {
  try {
    const db = getDb();
    const scheduledTasks = db.prepare(`
      SELECT * FROM scheduled_tasks
      ORDER BY next_run ASC
    `).all();

    return NextResponse.json({ scheduledTasks });
  } catch (error) {
    console.error('Error fetching scheduled tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch scheduled tasks' }, { status: 500 });
  }
}

// POST create new scheduled task
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();

    if (!body.prompt || !body.schedule || !body.chat_id) {
      return NextResponse.json({ error: 'prompt, schedule, and chat_id are required' }, { status: 400 });
    }

    const id = uuidv4().slice(0, 8);
    const now = Math.floor(Date.now() / 1000);

    // Calculate next run from cron expression
    let nextRun: number;
    try {
      const interval = cronParser.parse(body.schedule);
      nextRun = Math.floor(interval.next().getTime() / 1000);
    } catch {
      return NextResponse.json({ error: 'Invalid cron expression' }, { status: 400 });
    }

    const stmt = db.prepare(`
      INSERT INTO scheduled_tasks (id, chat_id, prompt, schedule, next_run, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?)
    `);

    stmt.run(id, body.chat_id, body.prompt, body.schedule, nextRun, now);

    const task = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id);

    return NextResponse.json({ scheduledTask: task }, { status: 201 });
  } catch (error) {
    console.error('Error creating scheduled task:', error);
    return NextResponse.json({ error: 'Failed to create scheduled task' }, { status: 500 });
  }
}

// PUT update scheduled task
export async function PUT(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (body.prompt !== undefined) {
      updates.push('prompt = ?');
      values.push(body.prompt);
    }

    if (body.schedule !== undefined) {
      updates.push('schedule = ?');
      values.push(body.schedule);

      // Recalculate next run
      try {
        const interval = cronParser.parse(body.schedule);
        const nextRun = Math.floor(interval.next().getTime() / 1000);
        updates.push('next_run = ?');
        values.push(nextRun);
      } catch {
        return NextResponse.json({ error: 'Invalid cron expression' }, { status: 400 });
      }
    }

    if (body.status !== undefined) {
      updates.push('status = ?');
      values.push(body.status);
    }

    if (body.chat_id !== undefined) {
      updates.push('chat_id = ?');
      values.push(body.chat_id);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(body.id);

    const stmt = db.prepare(`UPDATE scheduled_tasks SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    const task = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(body.id);

    return NextResponse.json({ scheduledTask: task });
  } catch (error) {
    console.error('Error updating scheduled task:', error);
    return NextResponse.json({ error: 'Failed to update scheduled task' }, { status: 500 });
  }
}

// DELETE scheduled task
export async function DELETE(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    db.prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scheduled task:', error);
    return NextResponse.json({ error: 'Failed to delete scheduled task' }, { status: 500 });
  }
}
