'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import LiveActivity from '@/components/LiveActivity';

interface Document {
  id: string;
  title: string;
  content: string | null;
  file_path: string | null;
  file_type: string | null;
  category: string;
  tags: string | null;
  chat_id: string | null;
  created_at: number;
  updated_at: number;
}

const categoryIcons: Record<string, string> = {
  general: '📄',
  report: '📊',
  letter: '✉️',
  memo: '📝',
  research: '🔬',
  technical: '⚙️',
  creative: '🎨',
  legal: '⚖️',
  financial: '💰',
  marketing: '📢',
};

const fileTypeIcons: Record<string, string> = {
  docx: '📘',
  pdf: '📕',
  txt: '📃',
  md: '📋',
  html: '🌐',
};

const categoryColors: Record<string, { bg: string; text: string }> = {
  general: { bg: 'bg-gray-600/20', text: 'text-gray-400' },
  report: { bg: 'bg-blue-600/20', text: 'text-blue-400' },
  letter: { bg: 'bg-green-600/20', text: 'text-green-400' },
  memo: { bg: 'bg-yellow-600/20', text: 'text-yellow-400' },
  research: { bg: 'bg-purple-600/20', text: 'text-purple-400' },
  technical: { bg: 'bg-orange-600/20', text: 'text-orange-400' },
  creative: { bg: 'bg-pink-600/20', text: 'text-pink-400' },
  legal: { bg: 'bg-red-600/20', text: 'text-red-400' },
  financial: { bg: 'bg-emerald-600/20', text: 'text-emerald-400' },
  marketing: { bg: 'bg-cyan-600/20', text: 'text-cyan-400' },
};

function timeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DocsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [fileTypes, setFileTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterFileType, setFilterFileType] = useState('all');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchDocuments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filterCategory !== 'all') params.set('category', filterCategory);
      if (filterFileType !== 'all') params.set('file_type', filterFileType);

      const res = await fetch(`/api/docs?${params.toString()}`);
      const data = await res.json();
      setDocuments(data.documents || []);
      setCategories(data.categories || []);
      setFileTypes(data.fileTypes || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterCategory, filterFileType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocuments();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchDocuments]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;

    try {
      await fetch(`/api/docs?id=${id}`, { method: 'DELETE' });
      setSelectedDoc(null);
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const getChatLabel = (chatId: string | null): string => {
    if (!chatId) return '';
    if (chatId === '5064547494') return 'Daniel (Telegram)';
    if (chatId === '7026103021') return 'Chioma (Telegram)';
    if (chatId === 'web') return 'Web Chat';
    return chatId;
  };

  const stats = {
    total: documents.length,
    categories: new Set(documents.map(d => d.category)).size,
    thisWeek: documents.filter(d => {
      const weekAgo = Math.floor(Date.now() / 1000) - 604800;
      return d.created_at > weekAgo;
    }).length,
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
              <h1 className="text-2xl font-bold text-white">Documents</h1>
              <p className="text-sm text-[#666]">Browse and search all created documents</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-purple-600 text-white' : 'bg-[#1a1a1a] text-[#666] hover:text-white'
                }`}
              >
                ▦
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-purple-600 text-white' : 'bg-[#1a1a1a] text-[#666] hover:text-white'
                }`}
              >
                ☰
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 md:flex md:items-center md:gap-8 mb-4 md:mb-6">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-white">{stats.total}</span>
              <span className="text-sm text-[#666]">Documents</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-purple-400">{stats.categories}</span>
              <span className="text-sm text-[#666]">Categories</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-green-400">{stats.thisWeek}</span>
              <span className="text-sm text-[#666]">This Week</span>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 md:gap-4 mb-4 md:mb-6">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {categoryIcons[cat] || '📄'} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>

            {/* File Type Filter */}
            <select
              value={filterFileType}
              onChange={(e) => setFilterFileType(e.target.value)}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Types</option>
              {fileTypes.map(type => (
                <option key={type} value={type}>
                  {fileTypeIcons[type] || '📄'} .{type}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-[#666] text-center py-12">Loading...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📂</div>
              <p className="text-[#666]">No documents found</p>
              {searchQuery && (
                <p className="text-sm text-[#555] mt-2">Try adjusting your search or filters</p>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {documents.map((doc) => {
                const catStyle = categoryColors[doc.category] || categoryColors.general;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-4 hover:border-purple-500/50 transition-colors cursor-pointer group"
                  >
                    {/* Icon and Type */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-3xl">
                        {doc.file_type ? (fileTypeIcons[doc.file_type] || '📄') : categoryIcons[doc.category] || '📄'}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc.id);
                          }}
                          className="p-1 rounded text-[#666] hover:text-red-400 hover:bg-red-600/10 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-white font-medium truncate mb-2">{doc.title}</h3>

                    {/* Preview */}
                    {doc.content && (
                      <p className="text-[#666] text-sm line-clamp-2 mb-3">
                        {doc.content.slice(0, 100)}...
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-2 mt-auto">
                      <span className={`text-xs px-2 py-0.5 rounded ${catStyle.bg} ${catStyle.text}`}>
                        {doc.category}
                      </span>
                      {doc.file_type && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[#252525] text-[#a0a0a0]">
                          .{doc.file_type}
                        </span>
                      )}
                      <span className="text-xs text-[#555] ml-auto">
                        {timeAgo(doc.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="space-y-2">
              {documents.map((doc) => {
                const catStyle = categoryColors[doc.category] || categoryColors.general;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-4 hover:border-purple-500/50 transition-colors cursor-pointer flex items-center gap-4"
                  >
                    {/* Icon */}
                    <div className="text-2xl">
                      {doc.file_type ? (fileTypeIcons[doc.file_type] || '📄') : categoryIcons[doc.category] || '📄'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{doc.title}</h3>
                      {doc.content && (
                        <p className="text-[#666] text-sm truncate">
                          {doc.content.slice(0, 150)}
                        </p>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${catStyle.bg} ${catStyle.text}`}>
                        {doc.category}
                      </span>
                      {doc.file_type && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[#252525] text-[#a0a0a0]">
                          .{doc.file_type}
                        </span>
                      )}
                      <span className="text-xs text-[#555] whitespace-nowrap">
                        {timeAgo(doc.created_at)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc.id);
                        }}
                        className="p-1 rounded text-[#666] hover:text-red-400 hover:bg-red-600/10 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <LiveActivity />

      {/* Document Detail Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-[#2a2a2a]">
              <div className="flex items-start gap-4">
                <div className="text-4xl">
                  {selectedDoc.file_type
                    ? (fileTypeIcons[selectedDoc.file_type] || '📄')
                    : categoryIcons[selectedDoc.category] || '📄'}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedDoc.title}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      (categoryColors[selectedDoc.category] || categoryColors.general).bg
                    } ${(categoryColors[selectedDoc.category] || categoryColors.general).text}`}>
                      {selectedDoc.category}
                    </span>
                    {selectedDoc.file_type && (
                      <span className="text-xs px-2 py-0.5 rounded bg-[#252525] text-[#a0a0a0]">
                        .{selectedDoc.file_type}
                      </span>
                    )}
                    {selectedDoc.chat_id && (
                      <span className="text-xs text-[#666]">
                        {getChatLabel(selectedDoc.chat_id)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-[#666] hover:text-white transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {selectedDoc.content ? (
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-[#c0c0c0] font-sans leading-relaxed">
                    {selectedDoc.content}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12 text-[#666]">
                  <p>No content preview available</p>
                  {selectedDoc.file_path && (
                    <p className="text-sm mt-2">
                      File: <code className="bg-[#252525] px-2 py-0.5 rounded">{selectedDoc.file_path}</code>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-[#2a2a2a] text-xs text-[#666]">
              <div className="flex items-center gap-4">
                <span>Created: {formatDate(selectedDoc.created_at)}</span>
                {selectedDoc.updated_at !== selectedDoc.created_at && (
                  <span>Updated: {formatDate(selectedDoc.updated_at)}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedDoc.file_path && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedDoc.file_path || '');
                    }}
                    className="px-3 py-1.5 bg-[#252525] hover:bg-[#303030] text-[#a0a0a0] rounded transition-colors"
                  >
                    Copy Path
                  </button>
                )}
                <button
                  onClick={() => handleDelete(selectedDoc.id)}
                  className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
