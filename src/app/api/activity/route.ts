import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET recent activity
export async function GET() {
  try {
    const db = getDb();
    const activities = db.prepare(`
      SELECT
        al.*,
        a.name as agent_name,
        t.title as task_title,
        t.status as current_status
      FROM activity_log al
      LEFT JOIN agents a ON al.agent_id = a.id
      LEFT JOIN tasks t ON al.task_id = t.id
      ORDER BY al.created_at DESC
      LIMIT 50
    `).all();

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
