'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import LiveActivity from '@/components/LiveActivity';

interface ScheduledTask {
  id: string;
  chat_id: string;
  prompt: string;
  schedule: string;
  next_run: number;
  last_run: number | null;
  last_result: string | null;
  status: 'active' | 'paused';
  created_at: number;
}

type ViewMode = 'all' | 'week' | 'day';

const cronPresets: { label: string; cron: string }[] = [
  { label: 'Every hour', cron: '0 * * * *' },
  { label: 'Every 4 hours', cron: '0 */4 * * *' },
  { label: 'Daily at 9am', cron: '0 9 * * *' },
  { label: 'Daily at 6pm', cron: '0 18 * * *' },
  { label: 'Monday 9am', cron: '0 9 * * 1' },
  { label: 'Weekdays 9am', cron: '0 9 * * 1-5' },
  { label: 'Every Sunday', cron: '0 10 * * 0' },
];

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatShortDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function timeUntil(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = timestamp - now;

  if (diff < 0) return 'overdue';
  if (diff < 60) return 'in < 1m';
  if (diff < 3600) return `in ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `in ${Math.floor(diff / 3600)}h`;
  return `in ${Math.floor(diff / 86400)}d`;
}

function describeCron(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (cron === '0 * * * *') return 'Every hour';
  if (cron.match(/^0 \*\/(\d+) \* \* \*$/)) {
    const interval = cron.match(/^0 \*\/(\d+) \* \* \*$/)?.[1];
    return `Every ${interval} hours`;
  }
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Daily at ${hour}:${minute.padStart(2, '0')}`;
  }
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '1-5') {
    return `Weekdays at ${hour}:${minute.padStart(2, '0')}`;
  }
  if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
    const days: Record<string, string> = {
      '0': 'Sun',
      '1': 'Mon',
      '2': 'Tue',
      '3': 'Wed',
      '4': 'Thu',
      '5': 'Fri',
      '6': 'Sat',
    };
    return `${days[dayOfWeek] || dayOfWeek} at ${hour}:${minute.padStart(2, '0')}`;
  }

  return cron;
}

// Get Monday of the current week
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get Sunday of the current week
function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

// Get start and end of a specific day
function getDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Format week range
function formatWeekRange(date: Date): string {
  const start = getWeekStart(date);
  const end = getWeekEnd(date);
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startStr} - ${endStr}`;
}

// Format day
function formatDayHeader(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function CalendarPage() {
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Form state
  const [formPrompt, setFormPrompt] = useState('');
  const [formSchedule, setFormSchedule] = useState('0 9 * * *');
  const [formChatId, setFormChatId] = useState('5064547494');

  const fetchScheduledTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/scheduled');
      const data = await res.json();
      setScheduledTasks(data.scheduledTasks || []);
    } catch (error) {
      console.error('Error fetching scheduled tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScheduledTasks();
    const interval = setInterval(fetchScheduledTasks, 30000);
    return () => clearInterval(interval);
  }, [fetchScheduledTasks]);

  // Filter tasks based on view mode
  const filteredTasks = useMemo(() => {
    if (viewMode === 'all') return scheduledTasks;

    const now = Math.floor(Date.now() / 1000);

    if (viewMode === 'week') {
      const weekStart = Math.floor(getWeekStart(selectedDate).getTime() / 1000);
      const weekEnd = Math.floor(getWeekEnd(selectedDate).getTime() / 1000);
      return scheduledTasks.filter(
        (task) => task.next_run >= weekStart && task.next_run <= weekEnd
      );
    }

    if (viewMode === 'day') {
      const { start, end } = getDayBounds(selectedDate);
      const dayStart = Math.floor(start.getTime() / 1000);
      const dayEnd = Math.floor(end.getTime() / 1000);
      return scheduledTasks.filter(
        (task) => task.next_run >= dayStart && task.next_run <= dayEnd
      );
    }

    return scheduledTasks;
  }, [scheduledTasks, viewMode, selectedDate]);

  // Get week days for week view
  const weekDays = useMemo(() => {
    const start = getWeekStart(selectedDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  // Group tasks by day for week view
  const tasksByDay = useMemo(() => {
    const grouped: Record<string, ScheduledTask[]> = {};
    weekDays.forEach((day) => {
      const key = day.toISOString().split('T')[0];
      grouped[key] = [];
    });

    filteredTasks.forEach((task) => {
      const taskDate = new Date(task.next_run * 1000);
      const key = taskDate.toISOString().split('T')[0];
      if (grouped[key]) {
        grouped[key].push(task);
      }
    });

    return grouped;
  }, [filteredTasks, weekDays]);

  const navigatePrev = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setSelectedDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleCreate = async () => {
    if (!formPrompt.trim()) return;

    try {
      await fetch('/api/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: formPrompt,
          schedule: formSchedule,
          chat_id: formChatId,
        }),
      });
      setShowNewModal(false);
      setFormPrompt('');
      fetchScheduledTasks();
    } catch (error) {
      console.error('Error creating scheduled task:', error);
    }
  };

  const handleUpdate = async () => {
    if (!editingTask || !formPrompt.trim()) return;

    try {
      await fetch('/api/scheduled', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTask.id,
          prompt: formPrompt,
          schedule: formSchedule,
          chat_id: formChatId,
        }),
      });
      setEditingTask(null);
      fetchScheduledTasks();
    } catch (error) {
      console.error('Error updating scheduled task:', error);
    }
  };

  const handleToggleStatus = async (task: ScheduledTask) => {
    try {
      await fetch('/api/scheduled', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: task.id,
          status: task.status === 'active' ? 'paused' : 'active',
        }),
      });
      fetchScheduledTasks();
    } catch (error) {
      console.error('Error toggling task status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this scheduled task?')) return;

    try {
      await fetch(`/api/scheduled?id=${id}`, { method: 'DELETE' });
      fetchScheduledTasks();
    } catch (error) {
      console.error('Error deleting scheduled task:', error);
    }
  };

  const openEditModal = (task: ScheduledTask) => {
    setEditingTask(task);
    setFormPrompt(task.prompt);
    setFormSchedule(task.schedule);
    setFormChatId(task.chat_id);
  };

  const openNewModal = () => {
    setFormPrompt('');
    setFormSchedule('0 9 * * *');
    setFormChatId('5064547494');
    setShowNewModal(true);
  };

  const activeTasks = scheduledTasks.filter((t) => t.status === 'active');
  const pausedTasks = scheduledTasks.filter((t) => t.status === 'paused');

  const renderTaskCard = (task: ScheduledTask, compact = false) => (
    <div
      key={task.id}
      className={`bg-[#161616] border rounded-lg p-3 ${
        task.status === 'paused' ? 'border-[#2a2a2a] opacity-60' : 'border-[#2a2a2a]'
      }`}
    >
      <div className={compact ? '' : 'flex items-start justify-between gap-4'}>
        <div className="flex-1 min-w-0">
          <p className={`text-white font-medium ${compact ? 'text-sm' : ''} truncate`}>
            {task.prompt}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
            <span className="text-purple-400">{formatShortDate(task.next_run)}</span>
            <span className="bg-[#252525] text-[#a0a0a0] px-1.5 py-0.5 rounded font-mono">
              {task.schedule}
            </span>
          </div>
        </div>

        {!compact && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleStatus(task)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                task.status === 'active'
                  ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                  : 'bg-[#252525] text-[#666] hover:text-white'
              }`}
            >
              {task.status === 'active' ? '⏸' : '▶'}
            </button>
            <button
              onClick={() => openEditModal(task)}
              className="px-3 py-1 rounded text-xs font-medium bg-[#252525] text-[#a0a0a0] hover:text-white transition-colors"
            >
              ✏️
            </button>
            <button
              onClick={() => handleDelete(task.id)}
              className="px-3 py-1 rounded text-xs font-medium bg-[#252525] text-red-400 hover:bg-red-600/20 transition-colors"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0d0d0d]">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 p-3 md:p-6 overflow-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Calendar</h1>
              <p className="text-xs md:text-sm text-[#666]">Scheduled cron jobs and recurring tasks</p>
            </div>
            <button
              onClick={openNewModal}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <span>+</span>
              <span className="hidden sm:inline">New schedule</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 md:gap-8 mb-4 md:mb-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl md:text-3xl font-bold text-white">{activeTasks.length}</span>
              <span className="text-xs md:text-sm text-[#666]">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl md:text-3xl font-bold text-[#666]">{pausedTasks.length}</span>
              <span className="text-xs md:text-sm text-[#666]">Paused</span>
            </div>
          </div>

          {/* View Mode Tabs and Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            {/* View Mode Tabs */}
            <div className="flex bg-[#161616] rounded-lg p-1">
              {(['all', 'week', 'day'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 md:px-4 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === mode
                      ? 'bg-purple-600 text-white'
                      : 'text-[#666] hover:text-white'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            {/* Navigation (only for week/day views) */}
            {viewMode !== 'all' && (
              <div className="flex items-center gap-2 md:gap-3">
                <button
                  onClick={navigatePrev}
                  className="px-2 md:px-3 py-1.5 bg-[#252525] rounded-lg text-[#a0a0a0] hover:text-white transition-colors"
                >
                  ←
                </button>
                <button
                  onClick={goToToday}
                  className="px-2 md:px-3 py-1.5 bg-[#252525] rounded-lg text-[#a0a0a0] hover:text-white transition-colors text-sm"
                >
                  Today
                </button>
                <span className="text-white font-medium text-sm md:text-base md:min-w-40 text-center">
                  {viewMode === 'week'
                    ? formatWeekRange(selectedDate)
                    : formatDayHeader(selectedDate)}
                </span>
                <button
                  onClick={navigateNext}
                  className="px-2 md:px-3 py-1.5 bg-[#252525] rounded-lg text-[#a0a0a0] hover:text-white transition-colors"
                >
                  →
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-[#666] text-center py-12">Loading...</div>
          ) : viewMode === 'week' ? (
            /* Week View - Grid */
            <div className="grid grid-cols-7 gap-2">
              {/* Day Headers */}
              {weekDays.map((day, i) => {
                const isToday =
                  day.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={i}
                    className={`text-center py-2 rounded-t-lg ${
                      isToday ? 'bg-purple-600/20' : 'bg-[#161616]'
                    }`}
                  >
                    <div className={`text-sm font-medium ${isToday ? 'text-purple-400' : 'text-[#a0a0a0]'}`}>
                      {dayNames[i]}
                    </div>
                    <div className={`text-lg ${isToday ? 'text-white' : 'text-[#666]'}`}>
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}

              {/* Day Columns */}
              {weekDays.map((day, i) => {
                const key = day.toISOString().split('T')[0];
                const dayTasks = tasksByDay[key] || [];
                const isToday = day.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={key}
                    className={`min-h-48 p-2 rounded-b-lg border-t ${
                      isToday
                        ? 'bg-purple-600/10 border-purple-600/30'
                        : 'bg-[#161616] border-[#2a2a2a]'
                    }`}
                  >
                    {dayTasks.length === 0 ? (
                      <div className="text-[#444] text-xs text-center py-4">No tasks</div>
                    ) : (
                      <div className="space-y-2">
                        {dayTasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => openEditModal(task)}
                            className={`p-2 rounded cursor-pointer text-xs transition-colors ${
                              task.status === 'paused'
                                ? 'bg-[#252525] opacity-50'
                                : 'bg-purple-600/20 hover:bg-purple-600/30'
                            }`}
                          >
                            <div className="text-white truncate">{task.prompt}</div>
                            <div className="text-purple-400 mt-0.5">
                              {formatShortDate(task.next_run)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : viewMode === 'day' ? (
            /* Day View - List */
            <div>
              {filteredTasks.length === 0 ? (
                <div className="text-[#666] text-center py-12">
                  No scheduled tasks for {formatDayHeader(selectedDate)}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task) => renderTaskCard(task))}
                </div>
              )}
            </div>
          ) : (
            /* All View - Original List */
            scheduledTasks.length === 0 ? (
              <div className="text-[#666] text-center py-12">No scheduled tasks yet</div>
            ) : (
              <div className="space-y-3">
                {scheduledTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`bg-[#161616] border rounded-lg p-4 ${
                      task.status === 'paused' ? 'border-[#2a2a2a] opacity-60' : 'border-[#2a2a2a]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium mb-2 truncate">{task.prompt}</p>

                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="bg-[#252525] text-[#a0a0a0] px-2 py-0.5 rounded font-mono text-xs">
                            {task.schedule}
                          </span>
                          <span className="text-purple-400">{describeCron(task.schedule)}</span>
                          <span className="text-[#666]">
                            Next: {formatDate(task.next_run)} ({timeUntil(task.next_run)})
                          </span>
                        </div>

                        {task.last_run && (
                          <div className="mt-2 text-xs text-[#666]">
                            Last run: {formatDate(task.last_run)}
                            {task.last_result && (
                              <span className="ml-2 text-[#555] truncate block max-w-lg">
                                Result: {task.last_result.slice(0, 100)}
                                {task.last_result.length > 100 ? '...' : ''}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(task)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            task.status === 'active'
                              ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                              : 'bg-[#252525] text-[#666] hover:text-white'
                          }`}
                        >
                          {task.status === 'active' ? '⏸ Pause' : '▶ Resume'}
                        </button>
                        <button
                          onClick={() => openEditModal(task)}
                          className="px-3 py-1 rounded text-xs font-medium bg-[#252525] text-[#a0a0a0] hover:text-white transition-colors"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="px-3 py-1 rounded text-xs font-medium bg-[#252525] text-red-400 hover:bg-red-600/20 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </main>
      </div>

      <LiveActivity />

      {/* New/Edit Modal */}
      {(showNewModal || editingTask) && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              {editingTask ? 'Edit Schedule' : 'New Schedule'}
            </h2>

            <div className="mb-4">
              <label className="block text-sm text-[#a0a0a0] mb-1">Prompt / Message</label>
              <textarea
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                className="w-full bg-[#252525] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                rows={3}
                placeholder="What should the agent do or say?"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-[#a0a0a0] mb-1">Schedule (cron)</label>
              <input
                type="text"
                value={formSchedule}
                onChange={(e) => setFormSchedule(e.target.value)}
                className="w-full bg-[#252525] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-purple-500 mb-2"
                placeholder="0 9 * * *"
              />

              <div className="flex flex-wrap gap-2">
                {cronPresets.map((preset) => (
                  <button
                    key={preset.cron}
                    onClick={() => setFormSchedule(preset.cron)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      formSchedule === preset.cron
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#252525] text-[#666] hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm text-[#a0a0a0] mb-1">Chat ID</label>
              <input
                type="text"
                value={formChatId}
                onChange={(e) => setFormChatId(e.target.value)}
                className="w-full bg-[#252525] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                placeholder="Telegram chat ID"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setEditingTask(null);
                }}
                className="px-4 py-2 text-sm text-[#a0a0a0] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingTask ? handleUpdate : handleCreate}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {editingTask ? 'Save Changes' : 'Create Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
