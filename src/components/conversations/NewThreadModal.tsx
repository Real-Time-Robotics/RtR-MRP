'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NewThreadModalProps {
  open: boolean
  onClose: () => void
  contextType: string
  contextId: string
  contextTitle?: string
  onCreated: (thread: unknown) => void
}

export function NewThreadModal({
  open,
  onClose,
  contextType,
  contextId,
  contextTitle,
  onCreated
}: NewThreadModalProps) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState('NORMAL')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      setError('Vui lòng nhập nội dung tin nhắn')
      return
    }

    setCreating(true)
    setError('')

    try {
      const res = await fetch('/api/v2/conversations/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextType,
          contextId,
          contextTitle,
          title: title.trim() || undefined,
          priority,
          initialMessage: message.trim(),
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create thread')
      }

      const thread = await res.json()

      // Reset form
      setTitle('')
      setMessage('')
      setPriority('NORMAL')

      onCreated(thread)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px] p-0 gap-0 bg-white dark:bg-steel-dark border-gray-200 dark:border-mrp-border">
        {/* Header - Industrial */}
        <DialogHeader className="px-4 py-3 border-b border-gray-200 dark:border-mrp-border bg-gray-50 dark:bg-gunmetal">
          <DialogTitle className="text-[13px] font-semibold font-mono uppercase tracking-wide text-gray-900 dark:text-mrp-text-primary">
            Tạo Discussion Mới
          </DialogTitle>
          <DialogDescription className="text-[11px] text-gray-500 dark:text-mrp-text-muted">
            Tạo cuộc thảo luận mới cho {contextTitle || contextType}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Title */}
          <div className="space-y-1">
            <label htmlFor="title" className="text-[11px] font-medium text-gray-700 dark:text-mrp-text-muted">
              Tiêu đề (tùy chọn)
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Hỏi về tiến độ, Yêu cầu kiểm tra..."
              disabled={creating}
              className={cn(
                "w-full h-8 px-2.5",
                "bg-white dark:bg-steel-dark border border-gray-200 dark:border-mrp-border",
                "text-[12px] text-gray-900 dark:text-mrp-text-primary",
                "placeholder:text-gray-400 dark:placeholder:text-mrp-text-muted",
                "focus:border-info-cyan focus:outline-none",
                "disabled:opacity-50"
              )}
            />
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <label htmlFor="priority" className="text-[11px] font-medium text-gray-700 dark:text-mrp-text-muted">
              Mức độ ưu tiên
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={creating}
              className={cn(
                "w-full h-8 px-2.5",
                "bg-white dark:bg-steel-dark border border-gray-200 dark:border-mrp-border",
                "text-[12px] text-gray-900 dark:text-mrp-text-primary",
                "focus:border-info-cyan focus:outline-none",
                "disabled:opacity-50"
              )}
            >
              <option value="LOW">Thấp</option>
              <option value="NORMAL">Bình thường</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">Khẩn cấp</option>
            </select>
          </div>

          {/* Initial message */}
          <div className="space-y-1">
            <label htmlFor="message" className="text-[11px] font-medium text-gray-700 dark:text-mrp-text-muted">
              Tin nhắn đầu tiên <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nhập nội dung thảo luận..."
              rows={4}
              disabled={creating}
              required
              className={cn(
                "w-full px-2.5 py-2 resize-none",
                "bg-white dark:bg-steel-dark border border-gray-200 dark:border-mrp-border",
                "text-[12px] text-gray-900 dark:text-mrp-text-primary",
                "placeholder:text-gray-400 dark:placeholder:text-mrp-text-muted",
                "focus:border-info-cyan focus:outline-none",
                "disabled:opacity-50"
              )}
            />
            <p className="text-[10px] text-gray-400 dark:text-mrp-text-muted">
              Dùng @ để mention role (ví dụ: @qa, @planner, @buyer)
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-[11px] text-red-500">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className={cn(
                "h-8 px-3 text-[11px] font-medium",
                "bg-gray-100 dark:bg-gunmetal text-gray-700 dark:text-mrp-text-secondary",
                "hover:bg-gray-200 dark:hover:bg-slate transition-colors",
                "border border-gray-200 dark:border-mrp-border",
                "disabled:opacity-50"
              )}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={creating || !message.trim()}
              className={cn(
                "h-8 px-3 text-[11px] font-medium",
                "bg-info-cyan text-steel-dark",
                "hover:bg-info-cyan/80 transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center gap-1.5"
              )}
            >
              {creating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                'Tạo Discussion'
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
