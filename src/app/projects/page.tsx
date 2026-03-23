'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import LiveActivity from '@/components/LiveActivity';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'archived';
  completion: number;
  assigned_agent_id: string | null;
  agent_name?: string;
  created_at: number;
  updated_at: number;
}

interface Agent {
  id: string;
  name: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  planning: { bg: 'bg-blue-600/20', text: 'text-blue-400' },
  active: { bg: 'bg-green-600/20', text: 'text-green-400' },
  paused: { bg: 'bg-yellow-600/20', text: 'text-yellow-400' },
  completed: { bg: 'bg-purple-600/20', text: 'text-purple-400' },
  archived: { bg: 'bg-gray-600/20', text: 'text-gray-400' },
};

const statusLabels: Record<string, string> = {
  planning: 'Planning',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  archived: 'Archived',
};

function daysAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  const days = Math.floor(diff / 86400);

  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<string>('planning');
  const [formCompletion, setFormCompletion] = useState(0);
  const [formAgentId, setFormAgentId] = useState<string>('');

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchAgents();
  }, [fetchProjects, fetchAgents]);

  const filteredProjects = filterStatus === 'all'
    ? projects
    : projects.filter(p => p.status === filterStatus);

  const openNewModal = () => {
    setFormName('');
    setFormDescription('');
    setFormStatus('planning');
    setFormCompletion(0);
    setFormAgentId('');
    setEditingProject(null);
    setShowModal(true);
  };

  const openEditModal = (project: Project) => {
    setFormName(project.name);
    setFormDescription(project.description || '');
    setFormStatus(project.status);
    setFormCompletion(project.completion);
    setFormAgentId(project.assigned_agent_id || '');
    setEditingProject(project);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) return;

    try {
      if (editingProject) {
        await fetch('/api/projects', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingProject.id,
            name: formName,
            description: formDescription,
            status: formStatus,
            completion: formCompletion,
            assigned_agent_id: formAgentId || null,
          }),
        });
      } else {
        await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            description: formDescription,
            status: formStatus,
            completion: formCompletion,
            assigned_agent_id: formAgentId || null,
          }),
        });
      }
      setShowModal(false);
      fetchProjects();
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return;

    try {
      await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    planning: projects.filter(p => p.status === 'planning').length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  return (
    <div className="flex h-screen bg-[#0d0d0d]">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 p-3 md:p-6 overflow-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Projects</h1>
              <p className="text-sm text-[#666]">Track project progress and agent assignments</p>
            </div>
            <button
              onClick={openNewModal}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <span>+</span>
              <span>New project</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 md:flex md:items-center md:gap-8 mb-4 md:mb-6">
            <div className="flex flex-col md:flex-row items-center md:gap-2">
              <span className="text-xl md:text-3xl font-bold text-white">{stats.total}</span>
              <span className="text-xs md:text-sm text-[#666]">Total</span>
            </div>
            <div className="flex flex-col md:flex-row items-center md:gap-2">
              <span className="text-xl md:text-3xl font-bold text-green-400">{stats.active}</span>
              <span className="text-xs md:text-sm text-[#666]">Active</span>
            </div>
            <div className="flex flex-col md:flex-row items-center md:gap-2">
              <span className="text-xl md:text-3xl font-bold text-blue-400">{stats.planning}</span>
              <span className="text-xs md:text-sm text-[#666]">Planning</span>
            </div>
            <div className="flex flex-col md:flex-row items-center md:gap-2">
              <span className="text-xl md:text-3xl font-bold text-purple-400">{stats.completed}</span>
              <span className="text-xs md:text-sm text-[#666]">Done</span>
            </div>
          </div>

          {/* Filter */}
          <div className="flex flex-wrap items-center gap-2 mb-4 md:mb-6">
            {['all', 'planning', 'active', 'paused', 'completed', 'archived'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filterStatus === status
                    ? 'bg-purple-600 text-white'
                    : 'bg-[#1a1a1a] text-[#666] hover:text-white'
                }`}
              >
                {status === 'all' ? 'All' : statusLabels[status]}
              </button>
            ))}
          </div>

          {/* Projects Grid */}
          {loading ? (
            <div className="text-[#666] text-center py-12">Loading...</div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-[#666] text-center py-12">No projects found</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {filteredProjects.map((project) => {
                const statusStyle = statusColors[project.status] || statusColors.planning;
                return (
                  <div
                    key={project.id}
                    className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#3a3a3a] transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate">{project.name}</h3>
                        {project.description && (
                          <p className="text-[#666] text-sm truncate mt-1">{project.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => openEditModal(project)}
                          className="p-1.5 rounded text-[#666] hover:text-white hover:bg-[#252525] transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="p-1.5 rounded text-[#666] hover:text-red-400 hover:bg-red-600/10 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[#666]">Progress</span>
                        <span className="text-white font-medium">{project.completion}%</span>
                      </div>
                      <div className="h-2 bg-[#252525] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-full transition-all"
                          style={{ width: `${project.completion}%` }}
                        />
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status */}
                      <span className={`text-xs px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.text}`}>
                        {statusLabels[project.status]}
                      </span>

                      {/* Agent */}
                      {project.agent_name && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[#252525] text-[#a0a0a0]">
                          🤖 {project.agent_name}
                        </span>
                      )}

                      {/* Created */}
                      <span className="text-xs text-[#555] ml-auto">
                        {daysAgo(project.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <LiveActivity />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] w-full max-w-lg p-4 md:p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">
              {editingProject ? 'Edit Project' : 'New Project'}
            </h2>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-sm text-[#a0a0a0] mb-1">Project Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full bg-[#252525] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                placeholder="Enter project name"
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm text-[#a0a0a0] mb-1">Description</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full bg-[#252525] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                rows={2}
                placeholder="Brief description"
              />
            </div>

            {/* Status */}
            <div className="mb-4">
              <label className="block text-sm text-[#a0a0a0] mb-1">Status</label>
              <div className="flex flex-wrap gap-2">
                {['planning', 'active', 'paused', 'completed', 'archived'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFormStatus(status)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      formStatus === status
                        ? `${statusColors[status].bg} ${statusColors[status].text}`
                        : 'bg-[#252525] text-[#666] hover:text-white'
                    }`}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
            </div>

            {/* Completion */}
            <div className="mb-4">
              <label className="block text-sm text-[#a0a0a0] mb-1">Completion: {formCompletion}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={formCompletion}
                onChange={(e) => setFormCompletion(parseInt(e.target.value))}
                className="w-full accent-purple-600"
              />
            </div>

            {/* Agent */}
            <div className="mb-6">
              <label className="block text-sm text-[#a0a0a0] mb-1">Assigned Agent</label>
              <select
                value={formAgentId}
                onChange={(e) => setFormAgentId(e.target.value)}
                className="w-full bg-[#252525] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="">No agent assigned</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-[#a0a0a0] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {editingProject ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
