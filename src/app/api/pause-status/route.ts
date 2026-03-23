import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET current pause state
export async function GET() {
  try {
    const db = getDb();

    // Check if all tasks are paused (backlog status doesn't count as paused)
    const activeTaskCount = db.prepare(`
      SELECT COUNT(*) as count FROM tasks
      WHERE status = 'in_progress'
    `).get() as { count: number };

    // Check scheduled tasks
    const activeScheduleCount = db.prepare(`
      SELECT COUNT(*) as count FROM scheduled_tasks
      WHERE status = 'active'
    `).get() as { count: number };

    // System is paused if no active scheduled tasks
    const paused = activeScheduleCount.count === 0;

    return NextResponse.json({
      paused,
      activeTaskCount: activeTaskCount.count,
      activeScheduleCount: activeScheduleCount.count,
    });
  } catch (error) {
    console.error('Error checking pause status:', error);
    return NextResponse.json({ paused: false, error: 'Failed to check status' });
  }
}
