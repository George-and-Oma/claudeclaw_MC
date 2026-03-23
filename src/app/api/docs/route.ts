import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

interface Document {
  id: string;
  title: string;
  content: string | null;
  file_path: string | null;
  file_type: string | null;
  category: string;
  tags: string | null;
  chat_id: string | null;
  created_at: number;
  updated_at: number;
}

// GET all documents with optional filtering
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const fileType = searchParams.get('file_type');

    let query = 'SELECT * FROM documents';
    const conditions: string[] = [];
    const params: any[] = [];

    if (category && category !== 'all') {
      conditions.push('category = ?');
      params.push(category);
    }

    if (fileType && fileType !== 'all') {
      conditions.push('file_type = ?');
      params.push(fileType);
    }

    if (search) {
      conditions.push('(title LIKE ? OR content LIKE ? OR tags LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const documents = db.prepare(query).all(...params) as Document[];

    // Get distinct categories for filtering
    const categories = db.prepare(
      'SELECT DISTINCT category FROM documents ORDER BY category'
    ).all() as { category: string }[];

    // Get distinct file types for filtering
    const fileTypes = db.prepare(
      'SELECT DISTINCT file_type FROM documents WHERE file_type IS NOT NULL ORDER BY file_type'
    ).all() as { file_type: string }[];

    return NextResponse.json({
      documents,
      categories: categories.map(c => c.category),
      fileTypes: fileTypes.map(f => f.file_type),
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

// POST create new document
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { title, content, file_path, file_type, category, tags, chat_id } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    db.prepare(`
      INSERT INTO documents (id, title, content, file_path, file_type, category, tags, chat_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, content || null, file_path || null, file_type || null, category || 'general', tags || null, chat_id || null, now, now);

    // Log activity
    db.prepare(`
      INSERT INTO activity_log (event_type, entity_type, entity_id, metadata, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('document_created', 'document', id, JSON.stringify({ title, category }), now);

    return NextResponse.json({ id, success: true });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}

// PUT update document
export async function PUT(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { id, title, content, file_path, file_type, category, tags } = body;

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);

    db.prepare(`
      UPDATE documents
      SET title = ?, content = ?, file_path = ?, file_type = ?, category = ?, tags = ?, updated_at = ?
      WHERE id = ?
    `).run(title, content || null, file_path || null, file_type || null, category || 'general', tags || null, now, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}

// DELETE document
export async function DELETE(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    db.prepare('DELETE FROM documents WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
