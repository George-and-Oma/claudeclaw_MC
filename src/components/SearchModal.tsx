'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  type: 'task' | 'agent' | 'schedule' | 'project' | 'document';
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  icon: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const [tasksRes, agentsRes, scheduledRes, projectsRes, docsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/agents'),
        fetch('/api/scheduled'),
        fetch('/api/projects'),
        fetch('/api/docs'),
      ]);

      const [tasksData, agentsData, scheduledData, projectsData, docsData] = await Promise.all([
        tasksRes.json(),
        agentsRes.json(),
        scheduledRes.json(),
        projectsRes.json(),
        docsRes.json(),
      ]);

      const searchResults: SearchResult[] = [];
      const lowerQuery = q.toLowerCase();

      // Search tasks
      (tasksData.tasks || []).forEach((task: any) => {
        if (
          task.title?.toLowerCase().includes(lowerQuery) ||
          task.description?.toLowerCase().includes(lowerQuery)
        ) {
          searchResults.push({
            type: 'task',
            id: task.id,
            title: task.title,
            subtitle: task.status?.replace('_', ' '),
            status: task.status,
            icon: '☑️',
          });
        }
      });

      // Search agents
      (agentsData.agents || []).forEach((agent: any) => {
        if (
          agent.name?.toLowerCase().includes(lowerQuery) ||
          agent.description?.toLowerCase().includes(lowerQuery)
        ) {
          searchResults.push({
            type: 'agent',
            id: agent.id,
            title: agent.name,
            subtitle: agent.description,
            icon: '🤖',
          });
        }
      });

      // Search scheduled tasks
      (scheduledData.scheduledTasks || []).forEach((schedule: any) => {
        if (schedule.prompt?.toLowerCase().includes(lowerQuery)) {
          searchResults.push({
            type: 'schedule',
            id: schedule.id,
            title: schedule.prompt,
            subtitle: schedule.schedule,
            status: schedule.status,
            icon: '📅',
          });
        }
      });

      // Search projects
      (projectsData.projects || []).forEach((project: any) => {
        if (
          project.name?.toLowerCase().includes(lowerQuery) ||
          project.description?.toLowerCase().includes(lowerQuery)
        ) {
          searchResults.push({
            type: 'project',
            id: project.id,
            title: project.name,
            subtitle: `${project.completion}% complete`,
            status: project.status,
            icon: '📁',
          });
        }
      });

      // Search documents
      (docsData.documents || []).forEach((doc: any) => {
        if (
          doc.title?.toLowerCase().includes(lowerQuery) ||
          doc.content?.toLowerCase().includes(lowerQuery) ||
          doc.tags?.toLowerCase().includes(lowerQuery)
        ) {
          searchResults.push({
            type: 'document',
            id: doc.id,
            title: doc.title,
            subtitle: doc.category,
            icon: '📚',
          });
        }
      });

      setResults(searchResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (result: SearchResult) => {
    onClose();
    if (result.type === 'task') {
      router.push('/');
    } else if (result.type === 'agent') {
      router.push('/agents');
    } else if (result.type === 'schedule') {
      router.push('/calendar');
    } else if (result.type === 'project') {
      router.push('/projects');
    } else if (result.type === 'document') {
      router.push('/docs');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-start justify-center pt-16 md:pt-24 z-50 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] w-full max-w-xl shadow-2xl">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a]">
          <span className="text-[#666]">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, agents, schedules, docs..."
            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-[#666]"
          />
          {/* Close button - larger tap target for mobile */}
          <button
            onClick={onClose}
            className="p-2 -mr-1 text-[#666] hover:text-white active:bg-[#2a2a2a] rounded-lg transition-colors"
            aria-label="Close search"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="px-4 py-8 text-center text-[#666] text-sm">Searching...</div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="px-4 py-8 text-center text-[#666] text-sm">No results found</div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {results.map((result, i) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === selectedIndex ? 'bg-purple-600/20' : 'hover:bg-[#252525]'
                  }`}
                >
                  <span className="text-lg">{result.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-[#666] text-xs truncate">{result.subtitle}</p>
                    )}
                  </div>
                  <span className="text-xs text-[#666] capitalize">{result.type}</span>
                </button>
              ))}
            </div>
          )}

          {!loading && !query && (
            <div className="px-4 py-8 text-center text-[#666] text-sm">
              Type to search across tasks, agents, and schedules
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#2a2a2a] flex items-center justify-between">
          <div className="flex items-center gap-4 text-[10px] text-[#555]">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          {/* Mobile close button in footer */}
          <button
            onClick={onClose}
            className="md:hidden px-3 py-1.5 bg-[#2a2a2a] text-[#a0a0a0] text-xs rounded-lg active:bg-[#3a3a3a]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
