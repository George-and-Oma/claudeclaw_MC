'use client';

interface Agent {
  id: string;
  name: string;
  description?: string;
  model?: string;
  is_active: number;
  created_at: number;
  task_count: number;
  completed_count: number;
}

interface AgentCardProps {
  agent: Agent;
  onEdit: () => void;
  onDelete: () => void;
}

const agentColors: Record<string, string> = {
  Koby: '#8b5cf6',
  Natasha: '#ec4899',
};

function getAgentColor(name: string): string {
  if (agentColors[name]) return agentColors[name];
  // Generate a consistent color based on name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
}

export default function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
  const color = getAgentColor(agent.name);
  const completionRate = agent.task_count > 0
    ? Math.round((agent.completed_count / agent.task_count) * 100)
    : 0;

  return (
    <div
      className={`bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:border-[#3a3a3a] transition-colors ${
        agent.is_active === 0 ? 'opacity-50' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: color }}
          >
            {agent.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-white font-medium flex items-center gap-2">
              {agent.name}
              {agent.is_active === 0 && (
                <span className="text-xs bg-[#2a2a2a] text-[#666] px-2 py-0.5 rounded">
                  Inactive
                </span>
              )}
            </h3>
            <p className="text-xs text-[#666]">{agent.model || 'claude'}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-[#666] hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-[#666] hover:text-red-400 hover:bg-[#2a2a2a] rounded transition-colors"
            title="Deactivate"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Description */}
      {agent.description && (
        <p className="text-sm text-[#a0a0a0] mb-4 line-clamp-2">{agent.description}</p>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-white font-medium">{agent.task_count}</span>
            <span className="text-[#666] ml-1">tasks</span>
          </div>
          <div>
            <span className="text-green-500 font-medium">{agent.completed_count}</span>
            <span className="text-[#666] ml-1">done</span>
          </div>
        </div>

        {/* Progress bar */}
        {agent.task_count > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <span className="text-xs text-[#666]">{completionRate}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
