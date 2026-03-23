import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// POST - Pause or resume all tasks and schedules
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const pause = body.pause;

    const now = Math.floor(Date.now() / 1000);

    if (pause) {
      // Pause all scheduled tasks
      db.prepare(`
        UPDATE scheduled_tasks
        SET status = 'paused'
        WHERE status = 'active'
      `).run();

      // Log activity
      db.prepare(`
        INSERT INTO activity_log (event_type, summary, created_at)
        VALUES ('system_paused', 'All tasks and schedules paused', ?)
      `).run(now);

      return NextResponse.json({
        paused: true,
        message: 'All tasks and schedules paused',
      });
    } else {
      // Resume all scheduled tasks
      db.prepare(`
        UPDATE scheduled_tasks
        SET status = 'active'
        WHERE status = 'paused'
      `).run();

      // Log activity
      db.prepare(`
        INSERT INTO activity_log (event_type, summary, created_at)
        VALUES ('system_resumed', 'All tasks and schedules resumed', ?)
      `).run(now);

      return NextResponse.json({
        paused: false,
        message: 'All tasks and schedules resumed',
      });
    }
  } catch (error) {
    console.error('Error toggling pause:', error);
    return NextResponse.json({ error: 'Failed to toggle pause' }, { status: 500 });
  }
}
