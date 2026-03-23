'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import LiveActivity from '@/components/LiveActivity';
import AgentCard from '@/components/AgentCard';
import NewAgentModal from '@/components/NewAgentModal';
import EditAgentModal from '@/components/EditAgentModal';

interface Agent {
  id: string;
  name: string;
  description?: string;
  system_prompt?: string;
  model?: string;
  is_active: number;
  created_at: number;
  updated_at: number;
  task_count: number;
  completed_count: number;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this agent? Their tasks will be unassigned.')) return;
    try {
      await fetch(`/api/agents?id=${id}`, { method: 'DELETE' });
      fetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const activeAgents = agents.filter(a => a.is_active === 1);
  const inactiveAgents = agents.filter(a => a.is_active === 0);
  const displayAgents = showInactive ? agents : activeAgents;

  const totalTasks = agents.reduce((sum, a) => sum + (a.task_count || 0), 0);
  const totalCompleted = agents.reduce((sum, a) => sum + (a.completed_count || 0), 0);

  return (
    <div className="flex h-screen bg-[#0d0d0d]">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 p-6 overflow-y-auto">
          {/* Stats */}
          <div className="flex items-center gap-8 mb-6">
            <div>
              <span className="text-3xl font-bold text-white">{activeAgents.length}</span>
              <span className="text-sm text-[#666] ml-2">Active agents</span>
            </div>
            <div>
              <span className="text-3xl font-bold text-[#a0a0a0]">{totalTasks}</span>
              <span className="text-sm text-[#666] ml-2">Total tasks</span>
            </div>
            <div>
              <span className="text-3xl font-bold text-green-500">{totalCompleted}</span>
              <span className="text-sm text-[#666] ml-2">Completed</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <span>+</span>
                <span>New agent</span>
              </button>
              <label className="flex items-center gap-2 text-sm text-[#a0a0a0] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded bg-[#1a1a1a] border-[#2a2a2a]"
                />
                Show inactive ({inactiveAgents.length})
              </label>
            </div>
          </div>

          {/* Agents Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-[#666]">Loading agents...</div>
            </div>
          ) : displayAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="text-6xl mb-4">🤖</div>
              <div className="text-[#a0a0a0] mb-2">No agents yet</div>
              <div className="text-sm text-[#666]">Create your first agent to get started</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={() => setEditingAgent(agent)}
                  onDelete={() => handleDelete(agent.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <LiveActivity />

      <NewAgentModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onAgentCreated={fetchAgents}
      />

      {editingAgent && (
        <EditAgentModal
          agent={editingAgent}
          onClose={() => setEditingAgent(null)}
          onAgentUpdated={fetchAgents}
        />
      )}
    </div>
  );
}
