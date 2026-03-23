'use client';

import { useEffect, useState } from 'react';
import { useMobileLayout } from './MobileLayout';

interface Activity {
  id: number;
  event_type: string;
  agent_id?: string;
  agent_name?: string;
  task_id?: string;
  task_title?: string;
  task_status?: string;
  current_status?: string;
  summary: string;
  metadata?: string;
  created_at: number;
}

const agentColors: Record<string, string> = {
  Koby: '#8b5cf6',
  Natasha: '#ec4899',
  default: '#3b82f6',
};

const statusColors: Record<string, string> = {
  recurring: '#f59e0b',
  backlog: '#6b7280',
  in_progress: '#8b5cf6',
  review: '#3b82f6',
  completed: '#22c55e',
};

const statusLabels: Record<string, string> = {
  recurring: 'Recurring',
  backlog: 'Backlog',
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed',
};

const eventIcons: Record<string, string> = {
  task_created: '➕',
  task_updated: '✏️',
  task_moved: '↔️',
  task_deleted: '🗑️',
  message: '💬',
  system_paused: '⏸️',
  system_resumed: '▶️',
  project_created: '📁',
  project_deleted: '📁',
};

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export default function LiveActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { activityOpen, setActivityOpen } = useMobileLayout();

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/activity');
      const data = await res.json();
      setActivities(data.activities || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {activityOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setActivityOpen(false)}
        />
      )}

      {/* Activity panel */}
      <aside
        className={`
          fixed md:static inset-y-0 right-0 z-50
          w-72 md:w-64 h-screen bg-[#0d0d0d] border-l border-[#2a2a2a] p-4 overflow-y-auto
          transform transition-transform duration-300 ease-in-out
          ${activityOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Live Activity</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {/* Close button on mobile */}
            <button
              className="md:hidden p-1 text-[#666] hover:text-white"
              onClick={() => setActivityOpen(false)}
            >
              ✕
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-[#666] text-sm py-8">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="text-center text-[#666] text-sm py-8">No recent activity</div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const agentColor = activity.agent_name
                ? (agentColors[activity.agent_name] || agentColors.default)
                : '#666';
              const status = activity.current_status || activity.task_status;
              const statusColor = status ? statusColors[status] || '#666' : null;
              const statusLabel = status ? statusLabels[status] || status : null;
              const eventIcon = eventIcons[activity.event_type] || '📋';

              // Parse metadata for task_moved events
              let moveInfo: { from?: string; to?: string } | null = null;
              if (activity.event_type === 'task_moved' && activity.metadata) {
                try {
                  moveInfo = JSON.parse(activity.metadata);
                } catch {
                  // Ignore parse errors
                }
              }

              return (
                <div key={activity.id} className="bg-[#161616] rounded-lg p-3 border border-[#2a2a2a]">
                  {/* Header: Event type and time */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#666]">
                      {eventIcon} {activity.event_type === 'task_moved' ? 'moved' : activity.event_type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-[#666]">{timeAgo(activity.created_at)}</span>
                  </div>

                  {/* Task title */}
                  {activity.task_title && (
                    <p className="text-sm text-white font-medium mb-2 truncate">
                      {activity.task_title}
                    </p>
                  )}

                  {/* Fallback to summary if no task title */}
                  {!activity.task_title && (
                    <p className="text-xs text-[#a0a0a0] mb-2 truncate">
                      {activity.summary}
                    </p>
                  )}

                  {/* Movement indicator for task_moved */}
                  {moveInfo && moveInfo.from && moveInfo.to && (
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: (statusColors[moveInfo.from] || '#666') + '20',
                          color: statusColors[moveInfo.from] || '#666',
                        }}
                      >
                        {statusLabels[moveInfo.from] || moveInfo.from}
                      </span>
                      <span className="text-[#666] text-xs">→</span>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: (statusColors[moveInfo.to] || '#666') + '20',
                          color: statusColors[moveInfo.to] || '#666',
                        }}
                      >
                        {statusLabels[moveInfo.to] || moveInfo.to}
                      </span>
                    </div>
                  )}

                  {/* Tags row: Status and Agent (only show for non-moved events) */}
                  {!moveInfo && (
                    <div className="flex flex-wrap gap-1.5">
                      {/* Status/Column badge */}
                      {statusLabel && statusColor && (
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded"
                          style={{ backgroundColor: statusColor + '20', color: statusColor }}
                        >
                          {statusLabel}
                        </span>
                      )}

                      {/* Agent badge */}
                      {activity.agent_name && (
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded"
                          style={{ backgroundColor: agentColor + '20', color: agentColor }}
                        >
                          🤖 {activity.agent_name}
                        </span>
                      )}

                      {/* No agent assigned */}
                      {!activity.agent_name && activity.task_title && (
                        <span className="text-[10px] text-[#666] px-2 py-0.5 rounded bg-[#1f1f1f]">
                          Unassigned
                        </span>
                      )}
                    </div>
                  )}

                  {/* Agent badge for moved events */}
                  {moveInfo && activity.agent_name && (
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded"
                        style={{ backgroundColor: agentColor + '20', color: agentColor }}
                      >
                        🤖 {activity.agent_name}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </aside>
    </>
  );
}
