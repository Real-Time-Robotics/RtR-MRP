'use client';

import { useState, useEffect } from 'react';
import {
  History, Search, Filter, Download, ChevronDown, ChevronUp,
  User, Bot, Clock, CheckCircle, XCircle, AlertTriangle,
  Eye, ThumbsUp, ThumbsDown, MessageSquare, Zap, Shield,
  Calendar, RefreshCw, Loader2, ChevronLeft, ChevronRight
} from 'lucide-react';

// =============================================================================
// RTR AI COPILOT - AUDIT LOG VIEWER
// View and analyze all AI interactions for transparency and compliance
// =============================================================================

// Types
interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  userRole: string;
  sessionId: string;
  input: {
    type: 'text' | 'voice' | 'action';
    content: string;
    context: {
      page: string;
      module: string;
    };
  };
  processing: {
    intent: string;
    agent: string;
    tokensUsed: number;
    latencyMs: number;
  };
  output: {
    confidence: number;
    suggestedActions: string[];
    responseLength: number;
    hadWarnings: boolean;
  };
  userAction?: 'approved' | 'rejected' | 'modified' | 'ignored';
  feedback?: {
    rating: number;
    comment?: string;
  };
}

interface AuditLogViewerProps {
  language: 'en' | 'vi';
  userId?: string; // Filter by specific user
  dateRange?: { start: Date; end: Date };
}

// Returns empty array — audit logs will come from API when available
function generateMockAuditLogs(_count: number = 50): AuditLogEntry[] {
  return [];
}

// Confidence badge component
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const getStyle = () => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-700';
    if (confidence >= 0.7) return 'bg-blue-100 text-blue-700';
    if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStyle()}`}>
      {Math.round(confidence * 100)}%
    </span>
  );
}

// User action badge
function UserActionBadge({ action, language }: { action?: string; language: string }) {
  if (!action) return <span className="text-xs text-gray-400">-</span>;

  const styles: Record<string, { bg: string; text: string; label: string; labelVi: string }> = {
    approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved', labelVi: 'Đã duyệt' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected', labelVi: 'Từ chối' },
    modified: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Modified', labelVi: 'Đã sửa' },
    ignored: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Ignored', labelVi: 'Bỏ qua' },
  };

  const style = styles[action] || styles.ignored;

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {language === 'vi' ? style.labelVi : style.label}
    </span>
  );
}

// Individual log entry component
function LogEntry({ 
  entry, 
  language, 
  expanded, 
  onToggle 
}: { 
  entry: AuditLogEntry; 
  language: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header - always visible */}
      <div 
        className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-4">
          {/* Timestamp */}
          <div className="text-sm text-gray-500 w-32">
            {entry.timestamp.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          
          {/* User */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 text-xs font-semibold">
                {entry.userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{entry.userName}</p>
              <p className="text-xs text-gray-500 capitalize">{entry.userRole}</p>
            </div>
          </div>
          
          {/* Query preview */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 truncate max-w-md">
              {entry.input.content}
            </p>
            <p className="text-xs text-gray-500">
              {entry.input.context.page} • {entry.processing.intent}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Confidence */}
          <ConfidenceBadge confidence={entry.output.confidence} />
          
          {/* User action */}
          <UserActionBadge action={entry.userAction} language={language} />
          
          {/* Feedback indicator */}
          {entry.feedback && (
            <div className="flex items-center text-yellow-500">
              {Array.from({ length: entry.feedback.rating }).map((_, i) => (
                <span key={i}>★</span>
              ))}
            </div>
          )}
          
          {/* Warnings indicator */}
          {entry.output.hadWarnings && (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
          
          {/* Expand/collapse */}
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>
      
      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Input details */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <User className="h-4 w-4 mr-1" />
                {language === 'vi' ? 'Input' : 'Input'}
              </h4>
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-900">{entry.input.content}</p>
                <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
                  <span className="px-2 py-0.5 bg-gray-100 rounded">{entry.input.type}</span>
                  <span>{entry.input.context.page}</span>
                  <span>•</span>
                  <span>{entry.input.context.module}</span>
                </div>
              </div>
            </div>
            
            {/* Processing details */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <Bot className="h-4 w-4 mr-1" />
                {language === 'vi' ? 'Processing' : 'Processing'}
              </h4>
              <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Intent:</span>
                  <span className="font-mono text-gray-900">{entry.processing.intent}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Agent:</span>
                  <span className="font-mono text-gray-900">{entry.processing.agent}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tokens:</span>
                  <span className="text-gray-900">{entry.processing.tokensUsed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Latency:</span>
                  <span className="text-gray-900">{entry.processing.latencyMs}ms</span>
                </div>
              </div>
            </div>
            
            {/* Output details */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <MessageSquare className="h-4 w-4 mr-1" />
                {language === 'vi' ? 'Output' : 'Output'}
              </h4>
              <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Confidence:</span>
                  <ConfidenceBadge confidence={entry.output.confidence} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Response length:</span>
                  <span className="text-gray-900">{entry.output.responseLength} chars</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Actions suggested:</span>
                  <span className="text-gray-900">{entry.output.suggestedActions.length}</span>
                </div>
                {entry.output.hadWarnings && (
                  <div className="flex items-center text-yellow-600 text-sm">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    {language === 'vi' ? 'Có cảnh báo' : 'Had warnings'}
                  </div>
                )}
              </div>
            </div>
            
            {/* User response */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <Zap className="h-4 w-4 mr-1" />
                {language === 'vi' ? 'User Response' : 'User Response'}
              </h4>
              <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Action:</span>
                  <UserActionBadge action={entry.userAction} language={language} />
                </div>
                {entry.feedback && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Rating:</span>
                      <div className="flex items-center text-yellow-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={i < entry.feedback!.rating ? '' : 'opacity-30'}>★</span>
                        ))}
                      </div>
                    </div>
                    {entry.feedback.comment && (
                      <div className="text-sm">
                        <span className="text-gray-500">Comment:</span>
                        <p className="text-gray-900 mt-1">{entry.feedback.comment}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Session info */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>Session: {entry.sessionId}</span>
            <span>Log ID: {entry.id}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Audit Log Viewer Component
export default function AuditLogViewer({
  language,
  userId,
  dateRange,
}: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    module: 'all',
    confidence: 'all',
    userAction: 'all',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 20;

  // Fetch logs
  useEffect(() => {
    setIsLoading(true);
    // In production, fetch from API
    setTimeout(() => {
      const mockLogs = generateMockAuditLogs(100);
      setLogs(mockLogs);
      setFilteredLogs(mockLogs);
      setIsLoading(false);
    }, 1000);
  }, [userId, dateRange]);

  // Apply filters
  useEffect(() => {
    let result = logs;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(log =>
        log.input.content.toLowerCase().includes(query) ||
        log.userName.toLowerCase().includes(query) ||
        log.processing.intent.toLowerCase().includes(query)
      );
    }

    // Module filter
    if (filters.module !== 'all') {
      result = result.filter(log => log.input.context.module === filters.module);
    }

    // Confidence filter
    if (filters.confidence !== 'all') {
      result = result.filter(log => {
        if (filters.confidence === 'high') return log.output.confidence >= 0.9;
        if (filters.confidence === 'medium') return log.output.confidence >= 0.7 && log.output.confidence < 0.9;
        if (filters.confidence === 'low') return log.output.confidence < 0.7;
        return true;
      });
    }

    // User action filter
    if (filters.userAction !== 'all') {
      result = result.filter(log => log.userAction === filters.userAction);
    }

    setFilteredLogs(result);
    setCurrentPage(1);
  }, [logs, searchQuery, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  // Stats
  const stats = {
    totalLogs: logs.length,
    avgConfidence: logs.length > 0 
      ? logs.reduce((sum, l) => sum + l.output.confidence, 0) / logs.length
      : 0,
    approvalRate: logs.length > 0
      ? logs.filter(l => l.userAction === 'approved').length / logs.filter(l => l.userAction).length
      : 0,
    avgLatency: logs.length > 0
      ? logs.reduce((sum, l) => sum + l.processing.latencyMs, 0) / logs.length
      : 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">
          {language === 'vi' ? 'Đang tải logs...' : 'Loading logs...'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <History className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {language === 'vi' ? 'AI Audit Logs' : 'AI Audit Logs'}
            </h2>
            <p className="text-sm text-gray-500">
              {language === 'vi' 
                ? 'Xem và phân tích tất cả tương tác AI'
                : 'View and analyze all AI interactions'}
            </p>
          </div>
        </div>
        
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Download className="h-4 w-4 mr-2" />
          {language === 'vi' ? 'Xuất CSV' : 'Export CSV'}
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {language === 'vi' ? 'Tổng logs' : 'Total Logs'}
            </span>
            <MessageSquare className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalLogs}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {language === 'vi' ? 'Confidence TB' : 'Avg Confidence'}
            </span>
            <Shield className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {Math.round(stats.avgConfidence * 100)}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {language === 'vi' ? 'Tỷ lệ duyệt' : 'Approval Rate'}
            </span>
            <CheckCircle className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {Math.round(stats.approvalRate * 100)}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {language === 'vi' ? 'Latency TB' : 'Avg Latency'}
            </span>
            <Clock className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {Math.round(stats.avgLatency)}ms
          </p>
        </div>
      </div>

      {/* Filters - compact single row */}
      <div className="flex items-center gap-1.5 flex-wrap bg-white px-3 py-2 rounded-lg border border-gray-200">
        <div className="relative w-48 lg:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'vi' ? 'Tìm kiếm...' : 'Search...'}
            aria-label={language === 'vi' ? 'Tìm kiếm' : 'Search'}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filters.module}
          onChange={(e) => setFilters(f => ({ ...f, module: e.target.value }))}
          aria-label={language === 'vi' ? 'Bộ lọc module' : 'Module filter'}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-md"
        >
          <option value="all">{language === 'vi' ? 'Tất cả module' : 'All modules'}</option>
          <option value="inventory">Inventory</option>
          <option value="sales">Sales</option>
          <option value="procurement">Procurement</option>
          <option value="production">Production</option>
          <option value="quality">Quality</option>
        </select>

        <select
          value={filters.confidence}
          onChange={(e) => setFilters(f => ({ ...f, confidence: e.target.value }))}
          aria-label={language === 'vi' ? 'Bộ lọc confidence' : 'Confidence filter'}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-md"
        >
          <option value="all">{language === 'vi' ? 'Tất cả confidence' : 'All confidence'}</option>
          <option value="high">{language === 'vi' ? 'Cao (≥90%)' : 'High (≥90%)'}</option>
          <option value="medium">{language === 'vi' ? 'TB (70-89%)' : 'Medium (70-89%)'}</option>
          <option value="low">{language === 'vi' ? 'Thấp (<70%)' : 'Low (<70%)'}</option>
        </select>

        <select
          value={filters.userAction}
          onChange={(e) => setFilters(f => ({ ...f, userAction: e.target.value }))}
          aria-label={language === 'vi' ? 'Bộ lọc hành động' : 'Action filter'}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-md"
        >
          <option value="all">{language === 'vi' ? 'Tất cả actions' : 'All actions'}</option>
          <option value="approved">{language === 'vi' ? 'Đã duyệt' : 'Approved'}</option>
          <option value="rejected">{language === 'vi' ? 'Từ chối' : 'Rejected'}</option>
          <option value="modified">{language === 'vi' ? 'Đã sửa' : 'Modified'}</option>
          <option value="ignored">{language === 'vi' ? 'Bỏ qua' : 'Ignored'}</option>
        </select>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        {language === 'vi'
          ? `Hiển thị ${paginatedLogs.length} / ${filteredLogs.length} kết quả`
          : `Showing ${paginatedLogs.length} of ${filteredLogs.length} results`}
      </div>

      {/* Log entries */}
      <div className="space-y-3">
        {paginatedLogs.map(log => (
          <LogEntry
            key={log.id}
            entry={log}
            language={language}
            expanded={expandedId === log.id}
            onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {language === 'vi' ? 'Trước' : 'Previous'}
          </button>
          
          <div className="flex items-center space-x-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
              if (page > totalPages) return null;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            {language === 'vi' ? 'Sau' : 'Next'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
}
