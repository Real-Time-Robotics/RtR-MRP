"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, Loader2, Lightbulb, RefreshCw } from "lucide-react";
import { ChatMessage } from "./chat-message";
import { SuggestionChips } from "./suggestion-chips";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionLinks?: Array<{ label: string; href: string }>;
  timestamp: Date;
}

interface ChatInterfaceProps {
  initialQuestion?: string;
}

const SUGGESTIONS = [
  "Top 5 co hoi giam chi phi lon nhat?",
  "Nen tu san xuat gi tiep theo?",
  "Tien do giam chi phi the nao?",
  "Tinh trang NDAA compliance?",
  "So sanh cac GPS module",
];

export function ChatInterface({ initialQuestion }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialQuestionSent = useRef(false);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send initial question if provided
  useEffect(() => {
    if (initialQuestion && !initialQuestionSent.current) {
      initialQuestionSent.current = true;
      sendMessage(initialQuestion);
    }
  }, [initialQuestion]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/cost-optimization/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message,
        actionLinks: data.actionLinks,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Xin loi, co loi xay ra. Vui long thu lai.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <Card className="h-[calc(100vh-12rem)]">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-600" />
          AI Cost Advisor
        </CardTitle>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-0 flex flex-col h-[calc(100%-4rem)]">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">AI Cost Advisor</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Hoi toi ve chi phi, co hoi tiet kiem, Make vs Buy, substitutes,
                hoac bat ky cau hoi nao ve toi uu chi phi san xuat.
              </p>

              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" />
                  Goi y cau hoi:
                </p>
                <SuggestionChips
                  suggestions={SUGGESTIONS}
                  onSelect={sendMessage}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Dang suy nghi...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-4 border-t">
          {messages.length > 0 && messages.length < 3 && (
            <div className="mb-3">
              <SuggestionChips
                suggestions={SUGGESTIONS.slice(0, 3)}
                onSelect={sendMessage}
                compact
              />
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hoi AI ve chi phi va toi uu..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
