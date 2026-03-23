'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import StatsBar from '@/components/StatsBar';
import KanbanColumn from '@/components/KanbanColumn';
import LiveActivity from '@/components/LiveActivity';
import NewTaskModal from '@/components/NewTaskModal';
import EditTaskModal from '@/components/EditTaskModal';
import { Task } from '@/components/TaskCard';

interface Agent {
  id: string;
  name: string;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
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
    fetchTasks();
    fetchAgents();
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, [fetchTasks, fetchAgents]);

  const handleDrop = async (taskId: string, newStatus: string) => {
    // Find old status for tracking
    const task = tasks.find(t => t.id === taskId);
    const oldStatus = task?.status;

    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          status: newStatus,
          previous_status: oldStatus, // Track where it came from
        }),
      });
      fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  // Filter tasks by selected agent
  const filteredTasks = selectedAgentId === 'all'
    ? tasks
    : selectedAgentId === 'unassigned'
    ? tasks.filter(t => !t.assigned_agent_id)
    : tasks.filter(t => t.assigned_agent_id === selectedAgentId);

  // Filter tasks by status
  const recurringTasks = filteredTasks.filter(t => t.status === 'recurring');
  const backlogTasks = filteredTasks.filter(t => t.status === 'backlog');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
  const reviewTasks = filteredTasks.filter(t => t.status === 'review');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  // Calculate stats
  const now = Math.floor(Date.now() / 1000);
  const oneWeekAgo = now - (7 * 24 * 60 * 60);
  const thisWeekTasks = filteredTasks.filter(t => t.created_at >= oneWeekAgo);
  const completionRate = filteredTasks.length > 0
    ? Math.round((completedTasks.length / filteredTasks.length) * 100)
    : 0;

  const selectedAgentName = selectedAgentId === 'all'
    ? 'All agents'
    : selectedAgentId === 'unassigned'
    ? 'Unassigned'
    : agents.find(a => a.id === selectedAgentId)?.name || 'All agents';

  return (
    <div className="flex h-screen bg-[#0d0d0d]">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 p-3 md:p-6 overflow-hidden">
          <StatsBar
            thisWeek={thisWeekTasks.length}
            inProgress={inProgressTasks.length}
            total={filteredTasks.length}
            completion={completionRate}
          />

          {/* Filters & New Task Button */}
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 md:gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 md:px-4 py-2 rounded-lg transition-colors"
            >
              <span>+</span>
              <span className="hidden sm:inline">New task</span>
            </button>

            {/* Agent Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
                  selectedAgentId !== 'all'
                    ? 'bg-purple-600/20 text-purple-400'
                    : 'text-[#a0a0a0] hover:text-white hover:bg-[#1f1f1f]'
                }`}
              >
                <span>{selectedAgentName}</span>
                <span className="text-xs">▼</span>
              </button>

              {showAgentDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-[#252525] border border-[#2a2a2a] rounded-lg shadow-lg z-20 py-1 min-w-40">
                  <button
                    onClick={() => {
                      setSelectedAgentId('all');
                      setShowAgentDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[#2a2a2a] ${
                      selectedAgentId === 'all' ? 'text-purple-400' : 'text-[#a0a0a0]'
                    }`}
                  >
                    All agents
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAgentId('unassigned');
                      setShowAgentDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[#2a2a2a] ${
                      selectedAgentId === 'unassigned' ? 'text-purple-400' : 'text-[#a0a0a0]'
                    }`}
                  >
                    Unassigned
                  </button>
                  <div className="border-t border-[#2a2a2a] my-1" />
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgentId(agent.id);
                        setShowAgentDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[#2a2a2a] flex items-center gap-2 ${
                        selectedAgentId === agent.id ? 'text-purple-400' : 'text-[#a0a0a0]'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      {agent.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Kanban Board */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-[#666]">Loading tasks...</div>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              <KanbanColumn
                title="Recurring"
                status="recurring"
                tasks={recurringTasks}
                color="#666666"
                onTaskUpdate={fetchTasks}
                onDrop={handleDrop}
                onEditTask={setEditingTask}
              />
              <KanbanColumn
                title="Backlog"
                status="backlog"
                tasks={backlogTasks}
                color="#ef4444"
                onTaskUpdate={fetchTasks}
                onDrop={handleDrop}
                onEditTask={setEditingTask}
              />
              <KanbanColumn
                title="In Progress"
                status="in_progress"
                tasks={inProgressTasks}
                color="#22c55e"
                onTaskUpdate={fetchTasks}
                onDrop={handleDrop}
                onEditTask={setEditingTask}
              />
              <KanbanColumn
                title="Review"
                status="review"
                tasks={reviewTasks}
                color="#eab308"
                onTaskUpdate={fetchTasks}
                onDrop={handleDrop}
                onEditTask={setEditingTask}
              />
              <KanbanColumn
                title="Completed"
                status="completed"
                tasks={completedTasks}
                color="#8b5cf6"
                onTaskUpdate={fetchTasks}
                onDrop={handleDrop}
                onEditTask={setEditingTask}
              />
            </div>
          )}
        </main>
      </div>

      <LiveActivity />

      <NewTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTaskCreated={fetchTasks}
      />

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onTaskUpdated={fetchTasks}
        />
      )}
    </div>
  );
}
