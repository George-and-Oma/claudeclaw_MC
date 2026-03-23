'use client';

import { useState } from 'react';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigned_agent_id?: string;
  agent_name?: string;
  tags?: string;
  created_at: number;
  updated_at: number;
}

interface TaskCardProps {
  task: Task;
  columnColor?: string;
  onUpdate: () => void;
  onDelete: () => void;
  onEdit: (task: Task) => void;
}

const priorityColors: Record<string, string> = {
  low: '#666666',
  medium: '#3b82f6',
  high: '#f97316',
  urgent: '#ef4444',
};

const agentColors: Record<string, string> = {
  Koby: '#8b5cf6',
  Natasha: '#ec4899',
};

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function TaskCard({ task, columnColor = '#8b5cf6', onUpdate, onDelete, onEdit }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status: newStatus, title: task.title }),
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating task:', error);
    }
    setShowMenu(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      await fetch(`/api/tasks?id=${task.id}`, { method: 'DELETE' });
      onDelete();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
    setShowMenu(false);
  };

  const tags = task.tags ? JSON.parse(task.tags) : [];
  const agentColor = task.agent_name ? (agentColors[task.agent_name] || '#3b82f6') : '#666';

  return (
    <div
      className="bg-[#1a1a1a] rounded-lg p-3 mb-2 border-l-2 hover:bg-[#1f1f1f] transition-colors group relative cursor-pointer"
      style={{ borderLeftColor: columnColor }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.setData('currentStatus', task.status);
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onEdit(task);
      }}
    >
      {/* Menu button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-[#666] hover:text-white transition-opacity p-1"
      >
        ⋮
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <div className="absolute top-8 right-2 bg-[#252525] border border-[#2a2a2a] rounded-lg shadow-lg z-10 py-1 min-w-32">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
              setShowMenu(false);
            }}
            className="w-full text-left px-3 py-1.5 text-sm text-[#a0a0a0] hover:bg-[#2a2a2a]"
          >
            Edit
          </button>
          <div className="px-3 py-1 text-xs text-[#666] border-t border-b border-[#2a2a2a]">Move to</div>
          {['recurring', 'backlog', 'in_progress', 'review', 'completed'].map((status) => (
            <button
              key={status}
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(status);
              }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[#2a2a2a] ${
                task.status === status ? 'text-purple-400' : 'text-[#a0a0a0]'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
          <div className="border-t border-[#2a2a2a] mt-1 pt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-[#2a2a2a]"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Title */}
      <h4 className="text-sm font-medium text-white mb-1 line-clamp-2 pr-6">
        {task.title}
      </h4>

      {task.description && (
        <p className="text-xs text-[#666] mb-2 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.agent_name && (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white font-medium"
              style={{ backgroundColor: agentColor }}
            >
              {task.agent_name.charAt(0)}
            </div>
          )}
          {tags.length > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: priorityColors[task.priority] + '20',
                color: priorityColors[task.priority],
              }}
            >
              {tags[0]}
            </span>
          )}
        </div>
        <span className="text-xs text-[#666]">{timeAgo(task.created_at)}</span>
      </div>
    </div>
  );
}
