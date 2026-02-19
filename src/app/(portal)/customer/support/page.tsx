'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Search, Plus, RefreshCw, Send,
  Clock, CheckCircle, AlertCircle, User, X,
  Package, Truck, FileText, HelpCircle, ChevronRight
} from 'lucide-react';
import {
  CustomerPortalEngine,
  SupportTicket
} from '@/lib/customer/customer-engine';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// CUSTOMER SUPPORT PAGE
// Phase 9: Customer Portal
// =============================================================================

export default function CustomerSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [newTicket, setNewTicket] = useState({
    category: 'GENERAL' as SupportTicket['category'],
    priority: 'MEDIUM' as SupportTicket['priority'],
    subject: '',
    description: '',
    soNumber: '',
  });

  const fetchTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/v2/customer?view=tickets');
      const result = await response.json();
      if (result.success) {
        setTickets(result.data.tickets || []);
        // Auto-select first ticket if any
        if (result.data.tickets?.length > 0 && !selectedTicket) {
          setSelectedTicket(result.data.tickets[0]);
        }
      }
    } catch (error) {
      clientLogger.error('Failed to fetch tickets', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Create new ticket
  const handleCreateTicket = async () => {
    try {
      const response = await fetch('/api/v2/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_ticket',
          ...newTicket,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setShowNewTicket(false);
        setNewTicket({
          category: 'GENERAL',
          priority: 'MEDIUM',
          subject: '',
          description: '',
          soNumber: '',
        });
        fetchTickets();
      }
    } catch (error) {
      clientLogger.error('Failed to create ticket', error);
    }
  };

  // Reply to ticket
  const handleReply = async () => {
    if (!selectedTicket || !newMessage.trim()) return;
    
    try {
      const response = await fetch('/api/v2/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply_ticket',
          ticketId: selectedTicket.id,
          message: newMessage,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setNewMessage('');
        fetchTickets();
      }
    } catch (error) {
      clientLogger.error('Failed to reply', error);
    }
  };

  // Get status icon
  const getStatusIcon = (status: SupportTicket['status']) => {
    switch (status) {
      case 'OPEN': return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'IN_PROGRESS': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'WAITING_CUSTOMER': return <User className="w-4 h-4 text-purple-500" />;
      case 'RESOLVED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'CLOSED': return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get category icon
  const getCategoryIcon = (category: SupportTicket['category']) => {
    switch (category) {
      case 'ORDER': return <Package className="w-4 h-4" />;
      case 'DELIVERY': return <Truck className="w-4 h-4" />;
      case 'QUALITY': return <AlertCircle className="w-4 h-4" />;
      case 'INVOICE': return <FileText className="w-4 h-4" />;
      case 'GENERAL': return <HelpCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-green-600" />
            Hỗ trợ khách hàng
          </h1>
          <p className="text-gray-500 mt-1">Liên hệ với chúng tôi để được hỗ trợ</p>
        </div>
        <button
          onClick={() => setShowNewTicket(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl flex items-center gap-2 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          Tạo ticket mới
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100%-100px)]">
        {/* Tickets List */}
        <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl border border-gray-200 dark:border-[rgb(var(--border-primary))] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-[rgb(var(--border-primary))]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm ticket..."
                aria-label="Tìm kiếm"
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-[rgb(var(--bg-tertiary))] rounded-xl focus:outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Chưa có ticket nào</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    selectedTicket?.id === ticket.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${CustomerPortalEngine.getTicketStatusColor(ticket.status)}`}>
                      {getCategoryIcon(ticket.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{ticket.ticketNumber}</span>
                        {getStatusIcon(ticket.status)}
                      </div>
                      <p className="font-medium truncate">{ticket.subject}</p>
                      <p className="text-sm text-gray-500 truncate">{ticket.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(ticket.updatedAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Ticket Detail / Chat */}
        <div className="lg:col-span-2 bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl border border-gray-200 dark:border-[rgb(var(--border-primary))] overflow-hidden flex flex-col">
          {selectedTicket ? (
            <>
              {/* Ticket Header */}
              <div className="p-4 border-b border-gray-200 dark:border-[rgb(var(--border-primary))]">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">{selectedTicket.ticketNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CustomerPortalEngine.getTicketStatusColor(selectedTicket.status)}`}>
                        {selectedTicket.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CustomerPortalEngine.getPriorityColor(selectedTicket.priority)}`}>
                        {selectedTicket.priority}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold mt-1">{selectedTicket.subject}</h2>
                    <p className="text-sm text-gray-500">
                      Danh mục: {CustomerPortalEngine.getTicketCategoryLabel(selectedTicket.category)}
                      {selectedTicket.soNumber && ` • Đơn hàng: ${selectedTicket.soNumber}`}
                    </p>
                  </div>
                  <button onClick={() => setSelectedTicket(null)} className="lg:hidden" aria-label="Đóng">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedTicket.messages.map(message => (
                  <div 
                    key={message.id}
                    className={`flex ${message.sender === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${
                      message.sender === 'CUSTOMER' 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-gray-100 dark:bg-[rgb(var(--bg-tertiary))]'
                    } rounded-2xl px-4 py-3`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium ${
                          message.sender === 'CUSTOMER' ? 'text-emerald-100' : 'text-gray-500'
                        }`}>
                          {message.senderName}
                        </span>
                        <span className={`text-xs ${
                          message.sender === 'CUSTOMER' ? 'text-emerald-200' : 'text-gray-400'
                        }`}>
                          {new Date(message.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Input */}
              {!['RESOLVED', 'CLOSED'].includes(selectedTicket.status) && (
                <div className="p-4 border-t border-gray-200 dark:border-[rgb(var(--border-primary))]">
                  <div className="flex items-end gap-3">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Nhập tin nhắn..."
                      aria-label="Nhập tin nhắn"
                      className="flex-1 px-4 py-3 bg-gray-100 dark:bg-[rgb(var(--bg-tertiary))] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      rows={2}
                    />
                    <button
                      onClick={handleReply}
                      disabled={!newMessage.trim()}
                      className="px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Gửi"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Chọn một ticket để xem chi tiết</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Tạo ticket hỗ trợ mới</h3>
                <button onClick={() => setShowNewTicket(false)} aria-label="Đóng">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Danh mục</label>
                    <select
                      value={newTicket.category}
                      onChange={(e) => setNewTicket(t => ({ ...t, category: e.target.value as SupportTicket['category'] }))}
                      aria-label="Danh mục"
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-[rgb(var(--bg-tertiary))] rounded-xl focus:outline-none"
                    >
                      <option value="ORDER">Đơn hàng</option>
                      <option value="DELIVERY">Giao hàng</option>
                      <option value="QUALITY">Chất lượng</option>
                      <option value="INVOICE">Hóa đơn</option>
                      <option value="GENERAL">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Độ ưu tiên</label>
                    <select
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket(t => ({ ...t, priority: e.target.value as SupportTicket['priority'] }))}
                      aria-label="Độ ưu tiên"
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-[rgb(var(--bg-tertiary))] rounded-xl focus:outline-none"
                    >
                      <option value="LOW">Thấp</option>
                      <option value="MEDIUM">Trung bình</option>
                      <option value="HIGH">Cao</option>
                      <option value="URGENT">Khẩn cấp</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Mã đơn hàng (nếu có)</label>
                  <input
                    type="text"
                    value={newTicket.soNumber}
                    onChange={(e) => setNewTicket(t => ({ ...t, soNumber: e.target.value }))}
                    aria-label="Mã đơn hàng"
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-[rgb(var(--bg-tertiary))] rounded-xl focus:outline-none"
                    placeholder="VD: SO-2025-0001"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Tiêu đề *</label>
                  <input
                    type="text"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket(t => ({ ...t, subject: e.target.value }))}
                    aria-label="Tiêu đề"
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-[rgb(var(--bg-tertiary))] rounded-xl focus:outline-none"
                    placeholder="Tóm tắt vấn đề của bạn"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Mô tả chi tiết *</label>
                  <textarea
                    value={newTicket.description}
                    onChange={(e) => setNewTicket(t => ({ ...t, description: e.target.value }))}
                    aria-label="Mô tả chi tiết"
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-[rgb(var(--bg-tertiary))] rounded-xl resize-none focus:outline-none"
                    rows={4}
                    placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                  />
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-[rgb(var(--border-primary))] flex justify-end gap-3">
              <button
                onClick={() => setShowNewTicket(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-[rgb(var(--sidebar-item-hover))] rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateTicket}
                disabled={!newTicket.subject || !newTicket.description}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Gửi ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
