import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  personality: string | null;
  mission_statement: string | null;
  reports_to: string | null;
  status: string;
  avatar: string | null;
  created_at: number;
  updated_at: number;
}

// Ensure team table exists
function ensureTeamTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      personality TEXT,
      mission_statement TEXT,
      reports_to TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      avatar TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
}

// GET all team members
export async function GET() {
  try {
    ensureTeamTable();
    const db = getDb();

    const members = db.prepare(`
      SELECT * FROM team_members ORDER BY
        CASE WHEN reports_to IS NULL THEN 0 ELSE 1 END,
        name ASC
    `).all() as TeamMember[];

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}

// POST create new team member
export async function POST(request: NextRequest) {
  try {
    ensureTeamTable();
    const db = getDb();
    const body = await request.json();
    const { id, name, role, personality, mission_statement, reports_to, avatar } = body;

    if (!name || !role) {
      return NextResponse.json({ error: 'Name and role are required' }, { status: 400 });
    }

    const memberId = id || `agent-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);

    db.prepare(`
      INSERT INTO team_members (id, name, role, personality, mission_statement, reports_to, status, avatar, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `).run(memberId, name, role, personality || null, mission_statement || null, reports_to || null, avatar || null, now, now);

    // Log activity
    db.prepare(`
      INSERT INTO activity_log (event_type, entity_type, entity_id, metadata, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('team_member_added', 'team', memberId, JSON.stringify({ name, role }), now);

    return NextResponse.json({ id: memberId, success: true });
  } catch (error) {
    console.error('Error creating team member:', error);
    return NextResponse.json({ error: 'Failed to create team member' }, { status: 500 });
  }
}

// PUT update team member
export async function PUT(request: NextRequest) {
  try {
    ensureTeamTable();
    const db = getDb();
    const body = await request.json();
    const { id, name, role, personality, mission_statement, reports_to, status, avatar } = body;

    if (!id) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);

    db.prepare(`
      UPDATE team_members
      SET name = ?, role = ?, personality = ?, mission_statement = ?, reports_to = ?, status = ?, avatar = ?, updated_at = ?
      WHERE id = ?
    `).run(name, role, personality || null, mission_statement || null, reports_to || null, status || 'active', avatar || null, now, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating team member:', error);
    return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 });
  }
}

// DELETE team member
export async function DELETE(request: NextRequest) {
  try {
    ensureTeamTable();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    db.prepare('DELETE FROM team_members WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team member:', error);
    return NextResponse.json({ error: 'Failed to delete team member' }, { status: 500 });
  }
}
