"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, User, ExternalLink, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionLinks?: Array<{ label: string; href: string }>;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser ? "bg-blue-100" : "bg-purple-100"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-blue-600" />
        ) : (
          <Bot className="w-4 h-4 text-purple-600" />
        )}
      </div>

      <div className={cn("flex-1 max-w-[80%]", isUser && "text-right")}>
        <Card
          className={cn(
            "p-3 inline-block text-left",
            isUser ? "bg-blue-50" : "bg-muted"
          )}
        >
          {isUser ? (
            <p className="text-sm">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-4 mb-2">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-4 mb-2">{children}</ol>
                  ),
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  strong: ({ children }) => (
                    <strong className="font-semibold text-primary">
                      {children}
                    </strong>
                  ),
                  h1: ({ children }) => (
                    <h4 className="font-semibold mb-2">{children}</h4>
                  ),
                  h2: ({ children }) => (
                    <h4 className="font-semibold mb-2">{children}</h4>
                  ),
                  h3: ({ children }) => (
                    <h4 className="font-semibold mb-2">{children}</h4>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </Card>

        {!isUser && message.actionLinks && message.actionLinks.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.actionLinks.map((link, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                asChild
                className="text-xs"
              >
                <Link href={link.href}>
                  {link.label}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            ))}
          </div>
        )}

        {!isUser && (
          <div className="flex items-center gap-2 mt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
