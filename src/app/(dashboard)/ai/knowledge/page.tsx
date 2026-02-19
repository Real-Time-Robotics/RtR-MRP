'use client';

import { useState, useEffect } from 'react';
import {
  Brain,
  Database,
  RefreshCw,
  Search,
  FileText,
  Package,
  Building2,
  Users,
  ShoppingCart,
  FileCheck,
  BookOpen,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// RAG KNOWLEDGE MANAGEMENT PAGE
// Monitor and manage AI knowledge base
// =============================================================================

interface KnowledgeStats {
  totalChunks: number;
  byType: Record<string, number>;
  lastIndexed: string | null;
  indexHealth: 'healthy' | 'stale' | 'empty';
}

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  link: string;
  score: number;
  metadata?: Record<string, any>;
}

const typeIcons: Record<string, any> = {
  part: Package,
  supplier: Building2,
  customer: Users,
  product: Package,
  order: ShoppingCart,
  bom: FileText,
  document: FileText,
  sop: BookOpen,
  compliance: FileCheck,
  note: FileText,
  history: Clock,
};

const typeLabels: Record<string, string> = {
  part: 'Vật tư',
  supplier: 'Nhà cung cấp',
  customer: 'Khách hàng',
  product: 'Sản phẩm',
  order: 'Đơn hàng',
  bom: 'BOM',
  document: 'Tài liệu',
  sop: 'SOP',
  compliance: 'Compliance',
  note: 'Ghi chú',
  history: 'Lịch sử',
};

export default function KnowledgePage() {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [indexLog, setIndexLog] = useState<string[]>([]);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/knowledge?action=stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIndexAll = async () => {
    setIndexing(true);
    setIndexLog(['Bắt đầu indexing knowledge base...']);

    try {
      const res = await fetch('/api/ai/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'index_all' }),
      });

      const data = await res.json();

      if (data.success) {
        setIndexLog(prev => [
          ...prev,
          `Parts: ${data.indexed.parts}`,
          `Suppliers: ${data.indexed.suppliers}`,
          `Customers: ${data.indexed.customers}`,
          `BOMs: ${data.indexed.boms}`,
          `Orders: ${data.indexed.orders}`,
          `Compliance: ${data.indexed.compliance}`,
          `Hoàn thành trong ${data.duration}`,
        ]);
        setStats(data.stats);
      } else {
        setIndexLog(prev => [...prev, `Lỗi: ${data.error}`]);
      }
    } catch (error) {
      setIndexLog(prev => [...prev, `Lỗi: ${error}`]);
    } finally {
      setIndexing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(`/api/ai/knowledge?action=search&q=${encodeURIComponent(searchQuery)}&limit=10`);
      const data = await res.json();

      if (data.success) {
        setSearchResults(data.results);
      }
    } catch (error) {
      clientLogger.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'stale':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getHealthLabel = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'Healthy';
      case 'stale':
        return 'Cần cập nhật';
      default:
        return 'Trống';
    }
  };

  return (
    <div className="bg-white dark:bg-steel-dark">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-mrp-border">
        <div className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary flex items-center gap-1.5">
                <Brain className="w-4 h-4" />
                RAG Knowledge Base
              </h1>
              <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">
                Quản lý kiến thức AI - Retrieval-Augmented Generation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchStats}
                disabled={loading}
                className="h-9 px-3 text-xs bg-gray-100 dark:bg-gunmetal text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1.5"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
                Refresh
              </button>
              <button
                onClick={handleIndexAll}
                disabled={indexing}
                className="h-9 px-3 text-xs bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 disabled:opacity-50"
              >
                {indexing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Database className="w-3.5 h-3.5" />
                )}
                Index All
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="py-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Total Chunks */}
          <div className="bg-white dark:bg-gunmetal p-4 border border-gray-200 dark:border-mrp-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Total Knowledge</p>
                <p className="text-2xl font-bold font-mono text-gray-900 dark:text-white">
                  {loading ? '-' : (stats?.totalChunks || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                <Brain className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Health Status */}
          <div className="bg-white dark:bg-gunmetal p-4 border border-gray-200 dark:border-mrp-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Index Health</p>
                {stats && (
                  <span className={cn('px-2 py-1 text-xs font-medium rounded mt-1 inline-block', getHealthColor(stats.indexHealth))}>
                    {getHealthLabel(stats.indexHealth)}
                  </span>
                )}
              </div>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded">
                {stats?.indexHealth === 'healthy' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : stats?.indexHealth === 'stale' ? (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {/* Last Indexed */}
          <div className="bg-white dark:bg-gunmetal p-4 border border-gray-200 dark:border-mrp-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Last Indexed</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {stats?.lastIndexed
                    ? new Date(stats.lastIndexed).toLocaleString('vi-VN')
                    : 'Chưa index'}
                </p>
              </div>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>

          {/* RAG Status */}
          <div className="bg-white dark:bg-gunmetal p-4 border border-gray-200 dark:border-mrp-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">RAG Status</p>
                <p className="text-sm font-medium text-green-600 mt-1 flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  Active
                </p>
              </div>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Knowledge Distribution */}
          <div className="bg-white dark:bg-gunmetal p-4 border border-gray-200 dark:border-mrp-border">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Phân bố Knowledge
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : stats && stats.byType ? (
              <div className="space-y-2">
                {Object.entries(stats.byType)
                  .filter(([_, count]) => count > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const Icon = typeIcons[type] || FileText;
                    const total = stats.totalChunks || 1;
                    const percentage = Math.round((count / total) * 100);

                    return (
                      <div key={type} className="flex items-center gap-3">
                        <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded">
                          <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-gray-700 dark:text-gray-300">
                              {typeLabels[type] || type}
                            </span>
                            <span className="font-mono text-gray-500">{count}</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {Object.values(stats.byType).every(v => v === 0) && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Knowledge base trống. Click "Index All" để bắt đầu.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Không có dữ liệu</p>
            )}
          </div>

          {/* Semantic Search Test */}
          <div className="bg-white dark:bg-gunmetal p-4 border border-gray-200 dark:border-mrp-border">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Test Semantic Search
            </h3>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Nhập từ khóa để tìm kiếm..."
                aria-label="Tìm kiếm"
                className="flex-1 h-8 px-3 bg-gray-100 dark:bg-gray-700 border-0 text-[11px] rounded focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="h-8 px-4 bg-blue-600 text-white text-[11px] font-medium rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {searching ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                Search
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((result) => {
                  const Icon = typeIcons[result.type] || FileText;
                  return (
                    <a
                      key={result.id}
                      href={result.link}
                      className="flex items-start gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                        <Icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-gray-900 dark:text-white truncate">
                          {result.title}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {result.subtitle}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                        {Math.round(result.score * 100)}%
                      </span>
                    </a>
                  );
                })
              ) : searchQuery && !searching ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Không tìm thấy kết quả
                </p>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  Nhập từ khóa và nhấn Search để test RAG
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Index Log */}
        {indexLog.length > 0 && (
          <div className="bg-white dark:bg-gunmetal p-4 border border-gray-200 dark:border-mrp-border">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Index Log
            </h3>
            <div className="bg-gray-900 dark:bg-black rounded p-3 font-mono text-xs text-green-400 max-h-[200px] overflow-y-auto">
              {indexLog.map((log, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-gray-500">[{String(i + 1).padStart(2, '0')}]</span>
                  <span>{log}</span>
                </div>
              ))}
              {indexing && (
                <div className="flex items-center gap-2 mt-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Processing...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* How RAG Works */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800 rounded">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-400 mb-2">
            RAG Knowledge Base hoạt động như thế nào?
          </h3>
          <div className="text-[11px] text-blue-700 dark:text-blue-500 space-y-2">
            <p>
              <strong>1. Indexing:</strong> Dữ liệu từ Parts, Suppliers, Customers, BOMs, Orders được chuyển
              thành vector embeddings và lưu trữ.
            </p>
            <p>
              <strong>2. Retrieval:</strong> Khi người dùng hỏi AI, hệ thống tìm kiếm các knowledge chunks
              liên quan nhất dựa trên semantic similarity.
            </p>
            <p>
              <strong>3. Augmentation:</strong> Context từ knowledge base được đưa vào prompt, giúp AI
              trả lời chính xác với dữ liệu thực tế của hệ thống.
            </p>
            <p className="mt-3">
              <strong>Tips:</strong> Index lại knowledge base khi có nhiều dữ liệu mới để AI có context
              mới nhất.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
