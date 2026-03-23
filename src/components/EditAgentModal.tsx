'use client';

import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  description?: string;
  system_prompt?: string;
  model?: string;
  is_active: number;
}

interface EditAgentModalProps {
  agent: Agent;
  onClose: () => void;
  onAgentUpdated: () => void;
}

export default function EditAgentModal({ agent, onClose, onAgentUpdated }: EditAgentModalProps) {
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description || '');
  const [systemPrompt, setSystemPrompt] = useState(agent.system_prompt || '');
  const [model, setModel] = useState(agent.model || 'claude');
  const [isActive, setIsActive] = useState(agent.is_active === 1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(agent.name);
    setDescription(agent.description || '');
    setSystemPrompt(agent.system_prompt || '');
    setModel(agent.model || 'claude');
    setIsActive(agent.is_active === 1);
  }, [agent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: agent.id,
          name,
          description,
          system_prompt: systemPrompt,
          model,
          is_active: isActive,
        }),
      });

      if (res.ok) {
        onAgentUpdated();
        onClose();
      }
    } catch (error) {
      console.error('Error updating agent:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-xl w-full max-w-lg p-6 border border-[#2a2a2a] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Edit Agent</h2>
          <button
            onClick={onClose}
            className="text-[#666] hover:text-white transition-colors text-xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-[#a0a0a0] mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-[#a0a0a0] mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm text-[#a0a0a0] mb-1">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="claude">Claude (Anthropic)</option>
              <option value="sonnet">Claude Sonnet</option>
              <option value="opus">Claude Opus</option>
              <option value="haiku">Claude Haiku</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#2a2a2a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
            <span className="text-sm text-[#a0a0a0]">Active</span>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm text-[#a0a0a0] mb-1">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={8}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 resize-none font-mono text-sm"
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
              disabled={loading || !name}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
