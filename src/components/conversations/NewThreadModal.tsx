'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tạo Discussion Mới</DialogTitle>
          <DialogDescription>
            Tạo cuộc thảo luận mới cho {contextTitle || contextType}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Tiêu đề (tùy chọn)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Hỏi về tiến độ, Yêu cầu kiểm tra..."
              disabled={creating}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Mức độ ưu tiên</Label>
            <Select value={priority} onValueChange={setPriority} disabled={creating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Thấp</SelectItem>
                <SelectItem value="NORMAL">Bình thường</SelectItem>
                <SelectItem value="HIGH">Cao</SelectItem>
                <SelectItem value="URGENT">Khẩn cấp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Initial message */}
          <div className="space-y-2">
            <Label htmlFor="message">Tin nhắn đầu tiên *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nhập nội dung thảo luận..."
              rows={4}
              disabled={creating}
              required
            />
            <p className="text-xs text-gray-500">
              Dùng @ để mention role (ví dụ: @qa, @planner, @buyer)
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={creating}>
              Hủy
            </Button>
            <Button type="submit" disabled={creating || !message.trim()}>
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                'Tạo Discussion'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
