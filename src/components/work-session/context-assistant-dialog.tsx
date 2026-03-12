'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Bot,
  Send,
  Sparkles,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

interface ChatAction {
  label: string;
  url: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: ChatAction[];
}

export function ContextAssistantDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    'T\u00f4i \u0111ang l\u00e0m g\u00ec d\u1edf?',
    'H\u00f4m qua t\u00f4i \u0111\u00e3 l\u00e0m g\u00ec?',
    'Nh\u1eafc t\u00f4i nh\u1eefng vi\u1ec7c c\u1ea7n l\u00e0m',
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cmd+J to open
  useKeyboardShortcuts({
    'Meta+j': (e) => {
      e.preventDefault();
      setIsOpen(true);
    },
    'Control+j': (e) => {
      e.preventDefault();
      setIsOpen(true);
    },
  });

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = useCallback(
    async (questionText?: string) => {
      const q = questionText || query;
      if (!q.trim() || isLoading) return;

      setMessages((prev) => [...prev, { role: 'user', content: q }]);
      setQuery('');
      setIsLoading(true);

      try {
        const res = await fetch('/api/ai/context-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: q,
            currentPage: typeof window !== 'undefined' ? window.location.pathname : '/',
          }),
        });

        const data = await res.json();

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.text || data.error || 'Xin l\u1ed7i, c\u00f3 l\u1ed7i x\u1ea3y ra.',
            actions: data.actions,
          },
        ]);

        if (data.suggestions?.length > 0) {
          setSuggestions(data.suggestions);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Xin l\u1ed7i, c\u00f3 l\u1ed7i x\u1ea3y ra. Vui l\u00f2ng th\u1eed l\u1ea1i.',
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [query, isLoading]
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Reset state when closing
    setMessages([]);
    setQuery('');
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? setIsOpen(true) : handleClose())}>
      <DialogContent className="sm:max-w-[550px] max-h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            {`Tr\u1EE3 l\u00FD AI`}
            <span className="text-xs text-muted-foreground font-normal bg-muted px-2 py-0.5 rounded">
              Cmd+J
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto min-h-[280px] max-h-[50vh] px-4 py-4 space-y-3 bg-muted/30">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary/40" />
              <p className="text-sm text-muted-foreground mb-4">
                {`T\u00f4i c\u00f3 th\u1ec3 gi\u00fap b\u1ea1n nh\u1edb l\u1ea1i context c\u00f4ng vi\u1ec7c`}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((s, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleSubmit(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border shadow-sm'
                  }`}
                >
                  {/* Render content as simple text with bold/line breaks */}
                  <div className="whitespace-pre-wrap">
                    {msg.content.split(/(\*\*.*?\*\*)/).map((part, j) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j}>{part.slice(2, -2)}</strong>;
                      }
                      return <span key={j}>{part}</span>;
                    })}
                  </div>

                  {/* Action buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {msg.actions.map((action, j) => (
                        <Button
                          key={j}
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs"
                          asChild
                        >
                          <a href={action.url}>
                            {action.label}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-background border rounded-lg px-3 py-2 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length > 0 && suggestions.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 border-t flex-wrap">
            <span className="text-xs text-muted-foreground">{`G\u1ee3i \u00fd:`}</span>
            {suggestions.slice(0, 3).map((s, i) => (
              <Button
                key={i}
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => handleSubmit(s)}
                disabled={isLoading}
              >
                {s}
              </Button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2 px-4 py-3 border-t bg-background">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`H\u1ecfi AI v\u1ec1 c\u00f4ng vi\u1ec7c c\u1ee7a b\u1ea1n...`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={isLoading}
            className="text-sm"
          />
          <Button
            onClick={() => handleSubmit()}
            disabled={isLoading || !query.trim()}
            size="sm"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
