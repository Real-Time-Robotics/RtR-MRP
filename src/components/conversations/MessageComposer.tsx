'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, AtSign, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { clientLogger } from '@/lib/client-logger'

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
      clientLogger.error('Failed to send message', error)
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`
    }
  }, [content])

  return (
    <div className="border-t border-gray-200 dark:border-mrp-border p-2 bg-gray-50 dark:bg-gunmetal/50">
      {/* Mention suggestions dropdown - Industrial */}
      {showMentions && (
        <div className="mb-2 p-2 bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted font-medium uppercase tracking-wide">Mention role:</p>
            <button
              onClick={() => setShowMentions(false)}
              className="p-0.5 hover:bg-gray-100 dark:hover:bg-slate transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {AVAILABLE_ROLES.map(role => (
              <button
                key={role.value}
                onClick={() => insertMention(role.value)}
                className="px-2 py-1 text-[10px] bg-info-cyan/10 text-info-cyan hover:bg-info-cyan/20 transition-colors"
                title={role.description}
              >
                @{role.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area - Industrial */}
      <div className="flex gap-1.5 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn... (@ để mention)"
            aria-label="Nhập tin nhắn"
            className={cn(
              "w-full min-h-[36px] max-h-[100px] resize-none pr-8 px-2.5 py-2",
              "bg-white dark:bg-steel-dark border border-gray-200 dark:border-mrp-border",
              "text-[12px] text-gray-900 dark:text-mrp-text-primary",
              "placeholder:text-gray-400 dark:placeholder:text-mrp-text-muted",
              "focus:border-info-cyan focus:outline-none",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            disabled={sending || disabled}
            rows={1}
          />
          <button
            onClick={() => setShowMentions(!showMentions)}
            className="absolute right-2 bottom-2 p-1 text-gray-400 hover:text-info-cyan transition-colors"
            type="button"
          >
            <AtSign className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!content.trim() || sending || disabled}
          className={cn(
            "h-9 w-9 flex items-center justify-center",
            "bg-info-cyan text-steel-dark",
            "hover:bg-info-cyan/80 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      <p className="text-[10px] text-gray-400 dark:text-mrp-text-muted mt-1.5">
        Enter để gửi, Shift+Enter để xuống dòng
      </p>
    </div>
  )
}
