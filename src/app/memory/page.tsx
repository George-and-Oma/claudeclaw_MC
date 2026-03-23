'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import LiveActivity from '@/components/LiveActivity';

interface DayEntry {
  day: string;
  message_count: number;
  first_message: number;
  last_message: number;
}

interface Message {
  id: number;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: number;
}

interface Memory {
  id: number;
  chat_id: string;
  topic_key: string | null;
  content: string;
  sector: 'semantic' | 'episodic';
  salience: number;
  created_at: number;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getFirstLine(content: string): string {
  // For memories, extract the user message part
  if (content.startsWith('User:')) {
    const userPart = content.split('\nAssistant:')[0].replace('User:', '').trim();
    return userPart.length > 80 ? userPart.slice(0, 80) + '...' : userPart;
  }
  const lines = content.split('\n').filter(l => l.trim());
  const first = lines[0] || '';
  return first.length > 80 ? first.slice(0, 80) + '...' : first;
}

function getChatLabel(chatId: string): { label: string; color: string } {
  if (chatId.startsWith('web_')) return { label: 'Web Chat', color: 'bg-blue-600/20 text-blue-400' };
  if (chatId === 'system') return { label: 'System', color: 'bg-gray-600/20 text-gray-400' };
  if (chatId === '5064547494') return { label: 'Daniel (Telegram)', color: 'bg-purple-600/20 text-purple-400' };
  if (chatId === '7026103021') return { label: 'Chioma (Telegram)', color: 'bg-pink-600/20 text-pink-400' };
  if (/^\d+$/.test(chatId)) return { label: `Telegram ${chatId}`, color: 'bg-purple-600/20 text-purple-400' };
  return { label: chatId.slice(0, 12), color: 'bg-gray-600/20 text-gray-400' };
}

export default function MemoryPage() {
  const [days, setDays] = useState<DayEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [chatConversations, setChatConversations] = useState<Record<string, Message[]>>({});
  const [memoryConversations, setMemoryConversations] = useState<Record<string, Memory[]>>({});
  const [expandedChats, setExpandedChats] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  const fetchDays = useCallback(async () => {
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_days' }),
      });
      const data = await res.json();
      setDays(data.days || []);
    } catch (error) {
      console.error('Error fetching days:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDayData = useCallback(async (day: string) => {
    setLoadingDay(true);
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_day_data', date: day }),
      });
      const data = await res.json();
      setChatConversations(data.chatConversations || {});
      setMemoryConversations(data.memoryConversations || {});
    } catch (error) {
      console.error('Error fetching day data:', error);
    } finally {
      setLoadingDay(false);
    }
  }, []);

  useEffect(() => {
    fetchDays();
  }, [fetchDays]);

  useEffect(() => {
    if (selectedDay) {
      fetchDayData(selectedDay);
      setExpandedChats(new Set());
    }
  }, [selectedDay, fetchDayData]);

  // Group days by year and month
  const groupedDays = useMemo(() => {
    const grouped: Record<string, Record<string, DayEntry[]>> = {};
    days.forEach(day => {
      const [year, month] = day.day.split('-');
      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][month]) grouped[year][month] = [];
      grouped[year][month].push(day);
    });
    return grouped;
  }, [days]);

  // Get days for calendar view
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay();
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const calendar: (DayEntry | null)[] = [];

    for (let i = 0; i < adjustedFirstDay; i++) {
      calendar.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEntry = days.find(day => day.day === dateStr);
      calendar.push(dayEntry || null);
    }

    return calendar;
  }, [days, selectedYear, selectedMonth]);

  const toggleChat = (chatId: string) => {
    const newExpanded = new Set(expandedChats);
    if (newExpanded.has(chatId)) {
      newExpanded.delete(chatId);
    } else {
      newExpanded.add(chatId);
    }
    setExpandedChats(newExpanded);
  };

  const years = Object.keys(groupedDays).sort((a, b) => parseInt(b) - parseInt(a));

  // Combine chat and memory data for display
  const allConversations = useMemo(() => {
    const combined: { chatId: string; type: 'chat' | 'memory'; data: Message[] | Memory[] }[] = [];

    // Add chat conversations
    Object.entries(chatConversations).forEach(([chatId, msgs]) => {
      combined.push({ chatId, type: 'chat', data: msgs });
    });

    // Add memory conversations (avoiding duplicates with chat)
    Object.entries(memoryConversations).forEach(([chatId, mems]) => {
      // Only add if not already in chat
      if (!chatConversations[chatId]) {
        combined.push({ chatId, type: 'memory', data: mems });
      }
    });

    return combined;
  }, [chatConversations, memoryConversations]);

  return (
    <div className="flex h-screen bg-[#0d0d0d]">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel - Navigation */}
          <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-[#2a2a2a] flex flex-col overflow-hidden max-h-[40vh] md:max-h-none">
            <div className="p-3 md:p-4 border-b border-[#2a2a2a]">
              <h1 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">Memory Journal</h1>

              <div className="flex bg-[#161616] rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-[#666] hover:text-white'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                    viewMode === 'calendar' ? 'bg-purple-600 text-white' : 'text-[#666] hover:text-white'
                  }`}
                >
                  Calendar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="text-[#666] text-center py-8">Loading...</div>
              ) : viewMode === 'list' ? (
                <div className="space-y-4">
                  {years.map(year => (
                    <div key={year}>
                      <div className="text-[#666] text-xs font-medium mb-2">{year}</div>
                      {Object.keys(groupedDays[year]).sort((a, b) => parseInt(b) - parseInt(a)).map(month => (
                        <div key={`${year}-${month}`} className="mb-3">
                          <div className="text-[#a0a0a0] text-sm font-medium mb-1">
                            {monthNames[parseInt(month) - 1]}
                          </div>
                          <div className="space-y-1">
                            {groupedDays[year][month].map(day => (
                              <button
                                key={day.day}
                                onClick={() => setSelectedDay(day.day)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                  selectedDay === day.day
                                    ? 'bg-purple-600/20 text-purple-400'
                                    : 'hover:bg-[#1f1f1f] text-[#a0a0a0]'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{new Date(day.day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}</span>
                                  <span className="text-xs text-[#666]">{day.message_count}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => {
                        if (selectedMonth === 0) {
                          setSelectedMonth(11);
                          setSelectedYear(selectedYear - 1);
                        } else {
                          setSelectedMonth(selectedMonth - 1);
                        }
                      }}
                      className="text-[#666] hover:text-white transition-colors"
                    >
                      ←
                    </button>
                    <span className="text-white font-medium">
                      {monthNames[selectedMonth]} {selectedYear}
                    </span>
                    <button
                      onClick={() => {
                        if (selectedMonth === 11) {
                          setSelectedMonth(0);
                          setSelectedYear(selectedYear + 1);
                        } else {
                          setSelectedMonth(selectedMonth + 1);
                        }
                      }}
                      className="text-[#666] hover:text-white transition-colors"
                    >
                      →
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                      <div key={i} className="text-center text-[10px] text-[#666]">{d}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, i) => {
                      if (!day) {
                        return <div key={i} className="aspect-square" />;
                      }
                      const dateNum = parseInt(day.day.split('-')[2]);
                      const isSelected = selectedDay === day.day;
                      const isToday = day.day === new Date().toISOString().split('T')[0];

                      return (
                        <button
                          key={day.day}
                          onClick={() => setSelectedDay(day.day)}
                          className={`aspect-square rounded-lg text-xs flex flex-col items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-purple-600 text-white'
                              : isToday
                              ? 'bg-purple-600/30 text-purple-400'
                              : day.message_count > 0
                              ? 'bg-[#252525] text-white hover:bg-[#2a2a2a]'
                              : 'text-[#444]'
                          }`}
                        >
                          <span>{dateNum}</span>
                          {day.message_count > 0 && (
                            <span className="text-[8px] mt-0.5">{day.message_count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Conversations */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selectedDay ? (
              <div className="flex flex-col items-center justify-center h-full text-[#666]">
                <span className="text-4xl mb-4">📔</span>
                <p>Select a day to view conversations</p>
              </div>
            ) : loadingDay ? (
              <div className="flex items-center justify-center h-full text-[#666]">
                Loading...
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white">{formatFullDate(selectedDay)}</h2>
                  <p className="text-sm text-[#666] mt-1">
                    {allConversations.length} conversation{allConversations.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {allConversations.length === 0 ? (
                  <div className="text-[#666] text-center py-12">No conversations found</div>
                ) : (
                  <div className="space-y-4">
                    {allConversations.map(({ chatId, type, data }) => {
                      const isExpanded = expandedChats.has(chatId);
                      const chatInfo = getChatLabel(chatId);
                      let topic = 'Conversation';
                      let firstTimestamp = 0;

                      if (type === 'chat') {
                        const msgs = data as Message[];
                        const firstUserMsg = msgs.find(m => m.role === 'user');
                        topic = firstUserMsg ? getFirstLine(firstUserMsg.content) : 'Conversation';
                        firstTimestamp = msgs[0]?.created_at || 0;
                      } else {
                        const mems = data as Memory[];
                        topic = getFirstLine(mems[0]?.content || '');
                        firstTimestamp = mems[0]?.created_at || 0;
                      }

                      return (
                        <div key={chatId} className="bg-[#161616] border border-[#2a2a2a] rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleChat(chatId)}
                            className="w-full p-4 text-left hover:bg-[#1a1a1a] transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs px-2 py-0.5 rounded ${chatInfo.color}`}>
                                    {chatInfo.label}
                                  </span>
                                  {type === 'memory' && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-yellow-600/20 text-yellow-400">
                                      Memory
                                    </span>
                                  )}
                                  <span className="text-xs text-[#666]">
                                    {formatTime(firstTimestamp)}
                                  </span>
                                </div>
                                <p className="text-white font-medium truncate">{topic}</p>
                                <p className="text-xs text-[#666] mt-1">{data.length} {type === 'chat' ? 'messages' : 'memories'}</p>
                              </div>
                              <span className="text-[#666]">{isExpanded ? '▼' : '▶'}</span>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-[#2a2a2a] p-4 space-y-3 max-h-96 overflow-y-auto">
                              {type === 'chat' ? (
                                (data as Message[]).map((msg) => (
                                  <div
                                    key={msg.id}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                  >
                                    <div
                                      className={`max-w-[80%] rounded-lg p-3 ${
                                        msg.role === 'user'
                                          ? 'bg-purple-600/20 text-purple-100'
                                          : 'bg-[#252525] text-[#a0a0a0]'
                                      }`}
                                    >
                                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                      <p className="text-[10px] text-[#666] mt-1 text-right">
                                        {formatTime(msg.created_at)}
                                      </p>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                (data as Memory[]).map((mem) => (
                                  <div key={mem.id} className="bg-[#1f1f1f] rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                                        mem.sector === 'episodic'
                                          ? 'bg-blue-600/20 text-blue-400'
                                          : 'bg-green-600/20 text-green-400'
                                      }`}>
                                        {mem.sector}
                                      </span>
                                      {mem.topic_key && (
                                        <span className="text-xs text-[#666]">{mem.topic_key}</span>
                                      )}
                                      <span className="text-xs text-[#666] ml-auto">
                                        {formatTime(mem.created_at)}
                                      </span>
                                    </div>
                                    <p className="text-sm text-[#a0a0a0] whitespace-pre-wrap">{mem.content}</p>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <LiveActivity />
    </div>
  );
}
