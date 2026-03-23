'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: number;
  pending?: boolean;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Generate session ID only on client to avoid hydration mismatch
  useEffect(() => {
    const stored = sessionStorage.getItem('chat-session-id');
    if (stored) {
      setSessionId(stored);
    } else {
      const newId = `session_${Date.now()}`;
      sessionStorage.setItem('chat-session-id', newId);
      setSessionId(newId);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/chat?session_id=${sessionId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) fetchMessages();
  }, [fetchMessages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add user message immediately
    const tempUserMsg: Message = {
      id: `temp_user_${Date.now()}`,
      role: 'user',
      content: userMessage,
      created_at: Math.floor(Date.now() / 1000),
    };

    // Add pending assistant message
    const tempAssistantMsg: Message = {
      id: `temp_assistant_${Date.now()}`,
      role: 'assistant',
      content: '',
      created_at: Math.floor(Date.now() / 1000),
      pending: true,
    };

    setMessages(prev => [...prev, tempUserMsg, tempAssistantMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId,
        }),
      });

      const data = await res.json();

      // Update with real response
      setMessages(prev => {
        const updated = prev.filter(m => !m.pending);
        return [...updated, {
          id: data.message_id || `msg_${Date.now()}`,
          role: 'assistant' as const,
          content: data.response || 'No response',
          created_at: Math.floor(Date.now() / 1000),
        }];
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => !m.pending));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearChat = async () => {
    if (!sessionId) return;
    try {
      await fetch(`/api/chat?session_id=${sessionId}`, { method: 'DELETE' });
      setMessages([]);
      // Generate new session
      const newId = `session_${Date.now()}`;
      sessionStorage.setItem('chat-session-id', newId);
      setSessionId(newId);
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  };

  return (
    <div className="flex h-screen bg-[#0d0d0d]">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-3 md:p-4 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-lg">
                🤖
              </div>
              <div>
                <h1 className="text-white font-semibold">Koby</h1>
                <p className="text-xs text-[#666]">Claude-powered assistant</p>
              </div>
            </div>
            <button
              onClick={clearChat}
              className="px-3 py-1.5 text-sm text-[#666] hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-5xl mb-4">👋</div>
                <h2 className="text-xl font-semibold text-white mb-2">Hey Daniel</h2>
                <p className="text-[#666] max-w-md">
                  I'm Koby, your AI assistant. Ask me anything or tell me to do something.
                  I can help with tasks, research, coding, scheduling, and more.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  {[
                    'What tasks are in progress?',
                    'Check my calendar',
                    'Search for files',
                    'Help me write code',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-[#a0a0a0] hover:text-white hover:border-[#3a3a3a] transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white rounded-br-md'
                        : 'bg-[#1a1a1a] text-[#e0e0e0] border border-[#2a2a2a] rounded-bl-md'
                    }`}
                  >
                    {msg.pending ? (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-[#666] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-[#666] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-[#666] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm text-[#666]">Thinking...</span>
                      </div>
                    ) : (
                      <>
                        <div className="whitespace-pre-wrap text-sm md:text-base">{msg.content}</div>
                        <div className={`text-[10px] mt-1 ${
                          msg.role === 'user' ? 'text-purple-200' : 'text-[#555]'
                        }`}>
                          {formatTime(msg.created_at)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 md:p-4 border-t border-[#2a2a2a]">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message Koby..."
                  disabled={loading}
                  rows={1}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm md:text-base resize-none focus:outline-none focus:border-purple-500 disabled:opacity-50 max-h-32"
                  style={{ minHeight: '48px' }}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-xl transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
            <p className="text-[10px] text-[#444] text-center mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
