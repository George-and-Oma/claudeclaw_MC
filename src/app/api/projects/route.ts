import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'archived';
  completion: number;
  assigned_agent_id: string | null;
  created_at: number;
  updated_at: number;
  agent_name?: string;
}

// GET all projects
export async function GET() {
  try {
    const db = getDb();
    const projects = db.prepare(`
      SELECT p.*, a.name as agent_name
      FROM projects p
      LEFT JOIN agents a ON p.assigned_agent_id = a.id
      ORDER BY p.updated_at DESC
    `).all();

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST create new project
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      INSERT INTO projects (id, name, description, status, completion, assigned_agent_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      body.name,
      body.description || null,
      body.status || 'planning',
      body.completion || 0,
      body.assigned_agent_id || null,
      now,
      now
    );

    // Log activity
    const activityStmt = db.prepare(`
      INSERT INTO activity_log (event_type, agent_id, summary, created_at)
      VALUES ('project_created', ?, ?, ?)
    `);
    activityStmt.run(body.assigned_agent_id || null, `Project created: ${body.name}`, now);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

// PUT update project
export async function PUT(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const now = Math.floor(Date.now() / 1000);

    if (!body.id) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) { updates.push('name = ?'); values.push(body.name); }
    if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
    if (body.status !== undefined) { updates.push('status = ?'); values.push(body.status); }
    if (body.completion !== undefined) { updates.push('completion = ?'); values.push(body.completion); }
    if (body.assigned_agent_id !== undefined) { updates.push('assigned_agent_id = ?'); values.push(body.assigned_agent_id); }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(body.id);

    const stmt = db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    const project = db.prepare(`
      SELECT p.*, a.name as agent_name
      FROM projects p
      LEFT JOIN agents a ON p.assigned_agent_id = a.id
      WHERE p.id = ?
    `).get(body.id);

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// DELETE project
export async function DELETE(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const project = db.prepare('SELECT name FROM projects WHERE id = ?').get(id) as { name: string } | undefined;

    db.prepare('DELETE FROM projects WHERE id = ?').run(id);

    // Log activity
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      INSERT INTO activity_log (event_type, summary, created_at)
      VALUES ('project_deleted', ?, ?)
    `).run(`Project deleted: ${project?.name || id}`, now);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
