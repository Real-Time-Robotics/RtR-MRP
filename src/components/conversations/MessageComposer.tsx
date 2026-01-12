'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, AtSign, Loader2, X } from 'lucide-react'

interface MessageComposerProps {
  threadId: string
  onSent?: (message: unknown) => void
  disabled?: boolean
}

// Available roles for mention
const AVAILABLE_ROLES = [
  { value: 'planner', label: 'Planner', description: 'Bộ phận kế hoạch' },
  { value: 'qa', label: 'QA', description: 'Kiểm soát chất lượng' },
  { value: 'buyer', label: 'Buyer', description: 'Bộ phận mua hàng' },
  { value: 'production', label: 'Production', description: 'Bộ phận sản xuất' },
  { value: 'engineering', label: 'Engineering', description: 'Bộ phận kỹ thuật' },
  { value: 'warehouse', label: 'Warehouse', description: 'Bộ phận kho' },
]

export function MessageComposer({ threadId, onSent, disabled }: MessageComposerProps) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async () => {
    if (!content.trim() || sending || disabled) return

    setSending(true)
    try {
      // Extract mentions from content
      const roleMentions = content.match(/@(planner|qa|buyer|production|engineering|warehouse)/gi) || []
      const mentionRoles = Array.from(new Set(roleMentions.map(m => m.replace('@', '').toLowerCase())))

      // Clean content
      const cleanContent = content.trim()

      const res = await fetch(`/api/v2/conversations/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: cleanContent,
          mentionRoles: mentionRoles.length > 0 ? mentionRoles : undefined,
        })
      })

      if (!res.ok) throw new Error('Failed to send')

      const message = await res.json()
      setContent('')
      onSent?.(message)

    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }

    // Detect @ for mention
    if (e.key === '@') {
      setShowMentions(true)
    }
  }

  const insertMention = (role: string) => {
    setContent(prev => prev + `@${role} `)
    setShowMentions(false)
    textareaRef.current?.focus()
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }, [content])

  return (
    <div className="border-t p-4 bg-white dark:bg-gray-950">
      {/* Mention suggestions dropdown */}
      {showMentions && (
        <div className="mb-3 p-3 bg-white dark:bg-gray-900 border rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 font-medium">Mention một role:</p>
            <button
              onClick={() => setShowMentions(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_ROLES.map(role => (
              <button
                key={role.value}
                onClick={() => insertMention(role.value)}
                className="px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                title={role.description}
              >
                @{role.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn... (@ để mention)"
            className="min-h-[44px] max-h-[150px] resize-none pr-10"
            disabled={sending || disabled}
            rows={1}
          />
          <button
            onClick={() => setShowMentions(!showMentions)}
            className="absolute right-2 bottom-2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            type="button"
          >
            <AtSign className="w-4 h-4" />
          </button>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || sending || disabled}
          size="icon"
          className="h-[44px] w-[44px]"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Enter để gửi, Shift+Enter để xuống dòng
      </p>
    </div>
  )
}
