import Database from 'better-sqlite3';

// Absolute path to the database
const DB_PATH = '/home/dg/claudeclaw/store/claudeclaw.db';

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'recurring' | 'backlog' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_agent_id?: string;
  tags?: string;
  due_date?: number;
  created_at: number;
  updated_at: number;
  completed_at?: number;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  is_active: number;
}

export interface ActivityLog {
  id: number;
  event_type: string;
  agent_id?: string;
  chat_id?: string;
  summary: string;
  metadata?: string;
  created_at: number;
}
