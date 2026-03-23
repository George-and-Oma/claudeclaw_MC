'use client';

import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
}

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

export default function NewTaskModal({ isOpen, onClose, onTaskCreated }: NewTaskModalProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('backlog');
  const [priority, setPriority] = useState('medium');
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/agents')
        .then(res => res.json())
        .then(data => setAgents(data.agents || []))
        .catch(console.error);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          status,
          priority,
          assigned_agent_id: assignedAgentId || null,
          tags: tags ? tags.split(',').map(t => t.trim()) : [],
        }),
      });

      if (res.ok) {
        setTitle('');
        setDescription('');
        setStatus('backlog');
        setPriority('medium');
        setAssignedAgentId('');
        setTags('');
        onTaskCreated();
        onClose();
      }
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-xl w-full max-w-lg p-6 border border-[#2a2a2a]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">New Task</h2>
          <button
            onClick={onClose}
            className="text-[#666] hover:text-white transition-colors text-xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm text-[#a0a0a0] mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              placeholder="Task title..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-[#a0a0a0] mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 resize-none"
              placeholder="Task description..."
            />
          </div>

          {/* Status & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#a0a0a0] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="recurring">Recurring</option>
                <option value="backlog">Backlog</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#a0a0a0] mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Assign to Agent */}
          <div>
            <label className="block text-sm text-[#a0a0a0] mb-1">Assign to Agent</label>
            <select
              value={assignedAgentId}
              onChange={(e) => setAssignedAgentId(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">Unassigned</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm text-[#a0a0a0] mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              placeholder="youtube, research, urgent..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#a0a0a0] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
