'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import LiveActivity from '@/components/LiveActivity';

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
  isAgent?: boolean; // Flag to identify if from agents table
}

const roleIcons: Record<string, string> = {
  ceo: '👔',
  cto: '💻',
  cfo: '💰',
  lead: '🎯',
  engineer: '⚙️',
  researcher: '🔬',
  analyst: '📊',
  writer: '✍️',
  designer: '🎨',
  assistant: '🤖',
  specialist: '🔧',
  coordinator: '📋',
  default: '👤',
};

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: 'bg-green-600/20', text: 'text-green-400', dot: 'bg-green-400' },
  idle: { bg: 'bg-yellow-600/20', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  offline: { bg: 'bg-gray-600/20', text: 'text-gray-400', dot: 'bg-gray-400' },
  busy: { bg: 'bg-red-600/20', text: 'text-red-400', dot: 'bg-red-400' },
};

function getAvatarColor(name: string): string {
  const colors = [
    'bg-purple-600', 'bg-blue-600', 'bg-green-600', 'bg-yellow-600',
    'bg-red-600', 'bg-pink-600', 'bg-indigo-600', 'bg-cyan-600'
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

function getRoleIcon(role: string): string {
  const lowerRole = role.toLowerCase();
  for (const [key, icon] of Object.entries(roleIcons)) {
    if (lowerRole.includes(key)) return icon;
  }
  return roleIcons.default;
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    role: '',
    personality: '',
    mission_statement: '',
    reports_to: '',
  });

  const fetchTeam = useCallback(async () => {
    try {
      // Fetch both team members and agents
      const [teamRes, agentsRes] = await Promise.all([
        fetch('/api/team'),
        fetch('/api/agents'),
      ]);
      const [teamData, agentsData] = await Promise.all([
        teamRes.json(),
        agentsRes.json(),
      ]);

      const teamMembers = teamData.members || [];
      const agents = (agentsData.agents || []).map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        role: agent.type || 'AI Agent',
        personality: agent.description || null,
        mission_statement: null,
        reports_to: null,
        status: agent.status || 'active',
        avatar: null,
        created_at: agent.created_at || Math.floor(Date.now() / 1000),
        updated_at: agent.created_at || Math.floor(Date.now() / 1000),
        isAgent: true,
      }));

      // Merge, avoiding duplicates by ID
      const teamIds = new Set(teamMembers.map((m: TeamMember) => m.id));
      const uniqueAgents = agents.filter((a: TeamMember) => !teamIds.has(a.id));

      setMembers([...teamMembers, ...uniqueAgents]);
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.role) return;

    try {
      await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember),
      });
      setShowAddModal(false);
      setNewMember({ name: '', role: '', personality: '', mission_statement: '', reports_to: '' });
      fetchTeam();
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;

    try {
      await fetch('/api/team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingMember),
      });
      setEditingMember(null);
      fetchTeam();
    } catch (error) {
      console.error('Error updating member:', error);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Remove this team member?')) return;

    try {
      await fetch(`/api/team?id=${id}`, { method: 'DELETE' });
      fetchTeam();
    } catch (error) {
      console.error('Error deleting member:', error);
    }
  };

  // Build org hierarchy
  const leaders = members.filter(m => !m.reports_to);
  const getReports = (leaderId: string) => members.filter(m => m.reports_to === leaderId);

  return (
    <div className="flex h-screen bg-[#0d0d0d]">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 p-3 md:p-6 overflow-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Meet the Team</h1>
              <p className="text-[#666] mt-1">Your AI agent workforce</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <span>+</span>
              <span>Add Agent</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 md:flex md:items-center md:gap-8 mb-4 md:mb-6">
            <div className="flex flex-col md:flex-row items-center md:gap-2">
              <span className="text-xl md:text-3xl font-bold text-white">{members.length}</span>
              <span className="text-xs md:text-sm text-[#666]">Total</span>
            </div>
            <div className="flex flex-col md:flex-row items-center md:gap-2">
              <span className="text-xl md:text-3xl font-bold text-green-400">
                {members.filter(m => m.status === 'active').length}
              </span>
              <span className="text-xs md:text-sm text-[#666]">Active</span>
            </div>
            <div className="flex flex-col md:flex-row items-center md:gap-2">
              <span className="text-xl md:text-3xl font-bold text-purple-400">
                {members.filter(m => m.isAgent).length}
              </span>
              <span className="text-xs md:text-sm text-[#666]">Agents</span>
            </div>
            <div className="flex flex-col md:flex-row items-center md:gap-2">
              <span className="text-xl md:text-3xl font-bold text-blue-400">
                {members.filter(m => !m.reports_to).length}
              </span>
              <span className="text-xs md:text-sm text-[#666]">Leaders</span>
            </div>
          </div>

          {loading ? (
            <div className="text-[#666] text-center py-12">Loading team...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-xl text-white mb-2">No team members yet</h2>
              <p className="text-[#666] mb-6">Add your first AI agent to the team</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Add First Agent
              </button>
            </div>
          ) : (
            /* Team Grid - Org Chart Style */
            <div className="space-y-8">
              {/* Leaders (no reports_to) */}
              {leaders.map((leader) => {
                const reports = getReports(leader.id);
                const statusStyle = statusColors[leader.status] || statusColors.active;

                return (
                  <div key={leader.id} className="space-y-4">
                    {/* Leader Card */}
                    <div
                      onClick={() => setEditingMember(leader)}
                      className="bg-gradient-to-r from-[#1a1a1a] to-[#161616] border border-[#2a2a2a] rounded-xl p-4 md:p-6 hover:border-purple-500/50 transition-all cursor-pointer max-w-2xl mx-auto"
                    >
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className={`w-16 h-16 rounded-xl ${getAvatarColor(leader.name)} flex items-center justify-center text-2xl font-bold text-white`}>
                          {leader.avatar || leader.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-xl font-semibold text-white">{leader.name}</h3>
                            <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                              {leader.status}
                            </span>
                            {leader.isAgent && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400">
                                System Agent
                              </span>
                            )}
                          </div>
                          <p className="text-purple-400 flex items-center gap-2">
                            <span>{getRoleIcon(leader.role)}</span>
                            <span>{leader.role}</span>
                          </p>

                          {leader.personality && (
                            <p className="text-[#888] text-sm mt-2 italic">"{leader.personality}"</p>
                          )}

                          {leader.mission_statement && (
                            <div className="mt-3 p-3 bg-[#0d0d0d] rounded-lg border border-[#252525]">
                              <p className="text-xs text-[#555] uppercase tracking-wide mb-1">Mission</p>
                              <p className="text-[#a0a0a0] text-sm">{leader.mission_statement}</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMember(leader.id);
                          }}
                          className="p-2 text-[#666] hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Reports */}
                    {reports.length > 0 && (
                      <div className="relative">
                        {/* Connector line */}
                        <div className="absolute left-1/2 -top-4 w-px h-4 bg-[#2a2a2a]"></div>
                        <div className="absolute left-1/4 top-0 right-1/4 h-px bg-[#2a2a2a]"></div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 pt-4">
                          {reports.map((member) => {
                            const memberStatusStyle = statusColors[member.status] || statusColors.active;

                            return (
                              <div
                                key={member.id}
                                onClick={() => setEditingMember(member)}
                                className="relative bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 hover:border-purple-500/50 transition-all cursor-pointer"
                              >
                                {/* Connector */}
                                <div className="absolute left-1/2 -top-4 w-px h-4 bg-[#2a2a2a]"></div>

                                <div className="flex items-start gap-3">
                                  {/* Avatar */}
                                  <div className={`w-12 h-12 rounded-lg ${getAvatarColor(member.name)} flex items-center justify-center text-lg font-bold text-white`}>
                                    {member.avatar || member.name.charAt(0).toUpperCase()}
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                      <h4 className="text-white font-medium truncate">{member.name}</h4>
                                      <span className={`w-2 h-2 rounded-full ${memberStatusStyle.dot}`}></span>
                                      {member.isAgent && (
                                        <span className="text-[9px] px-1 py-0.5 rounded bg-blue-600/20 text-blue-400">
                                          Agent
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[#888] text-sm flex items-center gap-1">
                                      <span>{getRoleIcon(member.role)}</span>
                                      <span className="truncate">{member.role}</span>
                                    </p>

                                    {member.personality && (
                                      <p className="text-[#666] text-xs mt-2 italic truncate">"{member.personality}"</p>
                                    )}

                                    {member.mission_statement && (
                                      <div className="mt-2 p-2 bg-[#0d0d0d] rounded border border-[#252525]">
                                        <p className="text-[#a0a0a0] text-xs line-clamp-2">{member.mission_statement}</p>
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMember(member.id);
                                    }}
                                    className="p-1 text-[#666] hover:text-red-400 hover:bg-red-600/10 rounded transition-colors"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Standalone members (no leader, not a leader themselves with reports) */}
              {members.filter(m => m.reports_to && !leaders.find(l => l.id === m.reports_to)).length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg text-[#666] mb-4">Other Team Members</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {members
                      .filter(m => m.reports_to && !leaders.find(l => l.id === m.reports_to))
                      .map((member) => {
                        const memberStatusStyle = statusColors[member.status] || statusColors.active;

                        return (
                          <div
                            key={member.id}
                            onClick={() => setEditingMember(member)}
                            className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 hover:border-purple-500/50 transition-all cursor-pointer"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-12 h-12 rounded-lg ${getAvatarColor(member.name)} flex items-center justify-center text-lg font-bold text-white`}>
                                {member.avatar || member.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                  <h4 className="text-white font-medium truncate">{member.name}</h4>
                                  <span className={`w-2 h-2 rounded-full ${memberStatusStyle.dot}`}></span>
                                  {member.isAgent && (
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-blue-600/20 text-blue-400">
                                      Agent
                                    </span>
                                  )}
                                </div>
                                <p className="text-[#888] text-sm">{member.role}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <LiveActivity />

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-semibold text-white">Add Team Member</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#666] hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-[#888] mb-1">Name *</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  placeholder="Agent name"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">Role *</label>
                <input
                  type="text"
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  placeholder="e.g. Research Analyst, Content Writer"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">Personality</label>
                <input
                  type="text"
                  value={newMember.personality}
                  onChange={(e) => setNewMember({ ...newMember, personality: e.target.value })}
                  placeholder="e.g. Meticulous, creative, fast-paced"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">Mission Statement</label>
                <textarea
                  value={newMember.mission_statement}
                  onChange={(e) => setNewMember({ ...newMember, mission_statement: e.target.value })}
                  placeholder="What is this agent's primary mission?"
                  rows={3}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">Reports To</label>
                <select
                  value={newMember.reports_to}
                  onChange={(e) => setNewMember({ ...newMember, reports_to: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">None (Top Level)</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} - {m.role}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-[#2a2a2a]">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-[#888] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!newMember.name || !newMember.role}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-semibold text-white">Edit {editingMember.name}</h2>
              <button
                onClick={() => setEditingMember(null)}
                className="text-[#666] hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-[#888] mb-1">Name</label>
                <input
                  type="text"
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">Role</label>
                <input
                  type="text"
                  value={editingMember.role}
                  onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">Personality</label>
                <input
                  type="text"
                  value={editingMember.personality || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, personality: e.target.value })}
                  placeholder="Describe personality traits"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">Mission Statement</label>
                <textarea
                  value={editingMember.mission_statement || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, mission_statement: e.target.value })}
                  placeholder="Define this agent's mission"
                  rows={4}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">Reports To</label>
                <select
                  value={editingMember.reports_to || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, reports_to: e.target.value || null })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">None (Top Level)</option>
                  {members.filter(m => m.id !== editingMember.id).map(m => (
                    <option key={m.id} value={m.id}>{m.name} - {m.role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#888] mb-1">Status</label>
                <select
                  value={editingMember.status}
                  onChange={(e) => setEditingMember({ ...editingMember, status: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="active">Active</option>
                  <option value="idle">Idle</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-[#2a2a2a]">
              <button
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 text-[#888] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateMember}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
