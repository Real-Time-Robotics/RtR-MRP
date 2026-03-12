import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { checkWriteEndpointLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import Anthropic from "@anthropic-ai/sdk";
import { COST_ADVISOR_SYSTEM_PROMPT } from "@/lib/cost-optimization/ai-prompts";
import {
  buildAIContext,
  formatContextForAI,
} from "@/lib/cost-optimization/ai-context";

const anthropic = new Anthropic();

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const POST = withAuth(async (request, _context, _session) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();
    const { message, history = [] } = body;

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Build context from database
    const context = await buildAIContext();
    const contextString = formatContextForAI(context);

    // Build system prompt with context
    const systemPrompt = COST_ADVISOR_SYSTEM_PROMPT.replace(
      "{context}",
      contextString
    );

    // Call Claude API
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        ...history.map((m: ChatMessage) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: message },
      ],
    });

    // Extract text response
    const assistantMessage = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    // Parse action links from response
    const actionLinks = parseActionLinks(assistantMessage);

    return NextResponse.json({
      message: assistantMessage,
      actionLinks,
      context: {
        autonomyPercent: context.autonomyStatus?.autonomyPercent,
        ytdSavings: context.recentSavings?.ytdTotal,
      },
    });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "POST /api/cost-optimization/ai/chat" }
    );
    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 }
    );
  }
});

function parseActionLinks(
  response: string
): Array<{ label: string; href: string }> {
  const links: Array<{ label: string; href: string }> = [];

  // Pattern: [Link Text](/path)
  const linkPattern = /\[([^\]]+)\]\(\/([^)]+)\)/g;
  let match;

  while ((match = linkPattern.exec(response)) !== null) {
    links.push({
      label: match[1],
      href: `/${match[2]}`,
    });
  }

  // Also detect suggestions for common actions
  const lowerResponse = response.toLowerCase();
  if (
    lowerResponse.includes("make vs buy") &&
    !links.some((l) => l.href.includes("make-vs-buy"))
  ) {
    links.push({
      label: "Go to Make vs Buy",
      href: "/cost-optimization/make-vs-buy/new",
    });
  }

  if (
    lowerResponse.includes("substitute") &&
    !links.some((l) => l.href.includes("substitutes"))
  ) {
    links.push({
      label: "Find Substitutes",
      href: "/cost-optimization/substitutes/new",
    });
  }

  return links;
}
