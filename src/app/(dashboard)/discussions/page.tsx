'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
  MessageSquare,
  Search,
  Filter,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Archive,
  Users,
  ChevronRight,
  Loader2,
  X,
  Package,
  Factory,
  ShoppingCart,
  Truck,
  ClipboardCheck,
  Building2,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  ConversationThread,
  ContextType,
  ThreadStatus,
  THREAD_STATUS_CONFIG,
} from '@/types/discussions';
import { ThreadPanel } from '@/components/discussions/thread-panel';

// =============================================================================
// TYPES
// =============================================================================

interface ThreadWithMeta extends ConversationThread {
  unreadCount: number;
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    sender?: { id: string; name: string | null; email: string };
    createdAt: string;
  } | null;
}

interface ThreadsResponse {
  threads: ThreadWithMeta[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CONTEXT_TYPE_CONFIG: Record<ContextType, { label: string; labelVi: string; icon: React.ElementType; color: string }> = {
  WORK_ORDER: { label: 'Work Order', labelVi: 'Lệnh SX', icon: Factory, color: 'text-orange-600 bg-orange-100' },
  BOM: { label: 'BOM', labelVi: 'BOM', icon: Package, color: 'text-purple-600 bg-purple-100' },
  PART: { label: 'Part', labelVi: 'Vật tư', icon: Package, color: 'text-blue-600 bg-blue-100' },
  INVENTORY: { label: 'Inventory', labelVi: 'Tồn kho', icon: Package, color: 'text-emerald-600 bg-emerald-100' },
  QC_REPORT: { label: 'Quality', labelVi: 'Chất lượng', icon: ClipboardCheck, color: 'text-teal-600 bg-teal-100' },
  MRP_RUN: { label: 'MRP', labelVi: 'MRP', icon: Factory, color: 'text-indigo-600 bg-indigo-100' },
  PURCHASE_ORDER: { label: 'Purchase Order', labelVi: 'Đơn mua', icon: ShoppingCart, color: 'text-green-600 bg-green-100' },
  SUPPLIER: { label: 'Supplier', labelVi: 'NCC', icon: Truck, color: 'text-amber-600 bg-amber-100' },
  CUSTOMER: { label: 'Customer', labelVi: 'Khách hàng', icon: Users, color: 'text-pink-600 bg-pink-100' },
  SALES_ORDER: { label: 'Sales Order', labelVi: 'Đơn hàng', icon: ShoppingCart, color: 'text-cyan-600 bg-cyan-100' },
  GENERAL: { label: 'General', labelVi: 'Chung', icon: MessageCircle, color: 'text-gray-600 bg-gray-100' },
};

const STATUS_ICONS: Record<ThreadStatus, React.ElementType> = {
  OPEN: AlertCircle,
  IN_PROGRESS: Clock,
  WAITING: Clock,
  RESOLVED: CheckCircle,
  ARCHIVED: Archive,
};

// =============================================================================
// FETCHER
// =============================================================================

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
});

// =============================================================================
// COMPONENTS
// =============================================================================

function ThreadCard({
  thread,
  isSelected,
  onClick,
  language,
}: {
  thread: ThreadWithMeta;
  isSelected: boolean;
  onClick: () => void;
  language: 'en' | 'vi';
}) {
  const contextConfig = CONTEXT_TYPE_CONFIG[thread.contextType as ContextType];
  const statusConfig = THREAD_STATUS_CONFIG[thread.status];
  const StatusIcon = STATUS_ICONS[thread.status];
  const ContextIcon = contextConfig?.icon || MessageSquare;

  const formatTime = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return language === 'vi' ? 'Vừa xong' : 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString();
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 border-b border-gray-100 dark:border-mrp-border cursor-pointer transition-colors',
        'hover:bg-gray-50 dark:hover:bg-gunmetal touch-manipulation',
        isSelected && 'bg-info-cyan/5 dark:bg-info-cyan/10 border-l-2 border-l-info-cyan'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Context Icon */}
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', contextConfig?.color || 'text-gray-600 bg-gray-100')}>
          <ContextIcon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-sm text-gray-900 dark:text-mrp-text-primary truncate">
              {thread.title || thread.contextTitle || `${contextConfig?.label || 'Discussion'} #${thread.contextId.slice(0, 8)}`}
            </h3>
            {thread.unreadCount > 0 && (
              <Badge className="bg-info-cyan text-white text-xs px-1.5 py-0.5 min-w-[20px] text-center">
                {thread.unreadCount}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {language === 'vi' ? contextConfig?.labelVi : contextConfig?.label}
            </Badge>
            <span className={cn('flex items-center gap-1 text-[10px]', `text-${statusConfig.color}-600`)}>
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </span>
          </div>

          {thread.lastMessage && (
            <p className="text-xs text-gray-500 dark:text-mrp-text-muted mt-1.5 line-clamp-1">
              <span className="font-medium">{thread.lastMessage.sender?.name || 'User'}:</span>{' '}
              {thread.lastMessage.content}
            </p>
          )}

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-mrp-text-muted">
              <Users className="w-3 h-3" />
              <span>{thread._count?.participants || 0}</span>
              <MessageSquare className="w-3 h-3 ml-2" />
              <span>{thread._count?.messages || 0}</span>
            </div>
            <span className="text-[10px] text-gray-400 dark:text-mrp-text-muted">
              {thread.lastMessageAt ? formatTime(thread.lastMessageAt) : formatTime(thread.createdAt)}
            </span>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-gray-400 dark:text-mrp-text-muted flex-shrink-0 mt-1" />
      </div>
    </div>
  );
}

function NewThreadModal({
  isOpen,
  onClose,
  onCreated,
  language,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  language: 'en' | 'vi';
}) {
  const [contextType, setContextType] = useState<ContextType>('GENERAL');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/discussions/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextType,
          contextId: `general-${Date.now()}`,
          contextTitle: title,
          title,
          initialMessage: message,
        }),
      });

      if (response.ok) {
        onCreated();
        onClose();
        setTitle('');
        setMessage('');
      }
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-steel-dark rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-mrp-border">
          <h2 className="font-semibold text-gray-900 dark:text-mrp-text-primary">
            {language === 'vi' ? 'Tạo cuộc thảo luận mới' : 'New Discussion'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gunmetal rounded" aria-label="Đóng">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-mrp-text-secondary mb-1">
              {language === 'vi' ? 'Loại' : 'Type'}
            </label>
            <Select value={contextType} onValueChange={(v) => setContextType(v as ContextType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONTEXT_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {language === 'vi' ? config.labelVi : config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-mrp-text-secondary mb-1">
              {language === 'vi' ? 'Tiêu đề' : 'Title'}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={language === 'vi' ? 'Nhập tiêu đề...' : 'Enter title...'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-mrp-text-secondary mb-1">
              {language === 'vi' ? 'Tin nhắn' : 'Message'}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={language === 'vi' ? 'Nhập tin nhắn đầu tiên...' : 'Enter first message...'}
              aria-label={language === 'vi' ? 'Tin nhắn' : 'Message'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-mrp-border rounded-lg bg-white dark:bg-steel-dark text-gray-900 dark:text-mrp-text-primary resize-none h-24"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-mrp-border">
          <Button variant="outline" onClick={onClose}>
            {language === 'vi' ? 'Hủy' : 'Cancel'}
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim() || !message.trim() || isCreating}>
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {language === 'vi' ? 'Tạo' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

function DiscussionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [language] = useState<'en' | 'vi'>('vi');
  const [search, setSearch] = useState('');
  const [contextFilter, setContextFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    searchParams.get('thread')
  );
  const [showNewModal, setShowNewModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Build API URL
  const apiUrl = `/api/discussions/threads/list?page=1&limit=50${contextFilter !== 'all' ? `&contextType=${contextFilter}` : ''}${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<ThreadsResponse>(apiUrl, fetcher, {
    refreshInterval: 10000,
  });

  // Get current user
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.id) {
          setCurrentUserId(data.user.id);
        }
      });
  }, []);

  // Update URL when thread is selected
  useEffect(() => {
    if (selectedThreadId) {
      router.push(`/discussions?thread=${selectedThreadId}`, { scroll: false });
    }
  }, [selectedThreadId, router]);

  const selectedThread = data?.threads?.find((t) => t.id === selectedThreadId);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-mrp-border">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-mrp-text-primary">
            {language === 'vi' ? 'Thảo luận' : 'Discussions'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-mrp-text-muted">
            {language === 'vi'
              ? 'Tất cả cuộc thảo luận của bạn'
              : 'All your conversations'}
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {language === 'vi' ? 'Tạo mới' : 'New'}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex mt-4 gap-4 min-h-0">
        {/* Thread List */}
        <div className={cn(
          'flex flex-col border border-gray-200 dark:border-mrp-border rounded-lg bg-white dark:bg-steel-dark overflow-hidden',
          selectedThreadId ? 'hidden md:flex md:w-[360px]' : 'flex-1'
        )}>
          {/* Filters */}
          <div className="p-3 border-b border-gray-200 dark:border-mrp-border space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={language === 'vi' ? 'Tìm kiếm...' : 'Search...'}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={contextFilter} onValueChange={setContextFilter}>
                <SelectTrigger className="flex-1">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'vi' ? 'Tất cả loại' : 'All types'}</SelectItem>
                  {Object.entries(CONTEXT_TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {language === 'vi' ? config.labelVi : config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'vi' ? 'Tất cả' : 'All status'}</SelectItem>
                  {Object.entries(THREAD_STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-info-cyan" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                <p className="text-sm text-red-500">
                  {language === 'vi' ? 'Lỗi tải dữ liệu' : 'Failed to load'}
                </p>
                <Button variant="link" size="sm" onClick={() => mutate()}>
                  {language === 'vi' ? 'Thử lại' : 'Retry'}
                </Button>
              </div>
            ) : data?.threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                <MessageSquare className="w-10 h-10 text-gray-300 dark:text-mrp-text-muted mb-2" />
                <p className="text-sm text-gray-500 dark:text-mrp-text-muted">
                  {language === 'vi' ? 'Chưa có cuộc thảo luận nào' : 'No discussions yet'}
                </p>
                <Button variant="link" size="sm" onClick={() => setShowNewModal(true)}>
                  {language === 'vi' ? 'Tạo mới' : 'Create one'}
                </Button>
              </div>
            ) : (
              data?.threads.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  isSelected={thread.id === selectedThreadId}
                  onClick={() => setSelectedThreadId(thread.id)}
                  language={language}
                />
              ))
            )}
          </div>

          {/* Pagination Info */}
          {data && data.pagination.total > 0 && (
            <div className="p-2 border-t border-gray-200 dark:border-mrp-border text-center">
              <span className="text-xs text-gray-500 dark:text-mrp-text-muted">
                {data.pagination.total} {language === 'vi' ? 'cuộc thảo luận' : 'discussions'}
              </span>
            </div>
          )}
        </div>

        {/* Thread Detail */}
        {selectedThreadId && selectedThread && currentUserId ? (
          <div className="flex-1 flex flex-col border border-gray-200 dark:border-mrp-border rounded-lg bg-white dark:bg-steel-dark overflow-hidden">
            {/* Detail Header */}
            <div className="flex items-center gap-3 p-3 border-b border-gray-200 dark:border-mrp-border">
              <button
                onClick={() => setSelectedThreadId(null)}
                className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gunmetal rounded"
                aria-label="Quay lại"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="font-medium text-gray-900 dark:text-mrp-text-primary truncate">
                  {selectedThread.title || selectedThread.contextTitle || 'Discussion'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-mrp-text-muted">
                  {CONTEXT_TYPE_CONFIG[selectedThread.contextType as ContextType]?.label} • {selectedThread._count?.participants} participants
                </p>
              </div>
            </div>

            {/* Embedded Thread Panel */}
            <div className="flex-1 overflow-hidden">
              <ThreadPanel
                contextType={selectedThread.contextType as ContextType}
                contextId={selectedThread.contextId}
                contextTitle={selectedThread.contextTitle || selectedThread.title}
                currentUserId={currentUserId}
                className="relative h-full w-full shadow-none border-0 rounded-none"
              />
            </div>
          </div>
        ) : !selectedThreadId ? (
          <div className="hidden md:flex flex-1 items-center justify-center border border-gray-200 dark:border-mrp-border rounded-lg bg-white dark:bg-steel-dark">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 dark:text-mrp-text-muted mx-auto mb-4" />
              <p className="text-gray-500 dark:text-mrp-text-muted">
                {language === 'vi'
                  ? 'Chọn một cuộc thảo luận để xem'
                  : 'Select a discussion to view'}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* New Thread Modal */}
      <NewThreadModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={() => mutate()}
        language={language}
      />
    </div>
  );
}

export default function DiscussionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <DiscussionsPageContent />
    </Suspense>
  );
}
