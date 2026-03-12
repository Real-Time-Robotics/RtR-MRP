// src/app/api/ai/context-assistant/route.ts
// AI Context Assistant endpoint

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  buildContextPrompt,
  detectQueryIntent,
  buildLocalResponse,
  type ContextAssistantResponse,
} from '@/lib/ai/context-assistant';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, currentPage, currentEntityType, currentEntityId } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Get active work sessions
    const workSessions = await prisma.workSession.findMany({
      where: {
        userId: session.user.id,
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
      orderBy: { lastActivityAt: 'desc' },
      take: 10,
    });

    // Get recent activities (24h)
    const recentActivities = await prisma.sessionActivity.findMany({
      where: {
        session: { userId: session.user.id },
        timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
      include: {
        session: {
          select: { entityType: true, entityNumber: true },
        },
      },
    });

    const intent = detectQueryIntent(query);

    // Serialize sessions for local response
    const serializedSessions = workSessions.map((ws) => {
      const ctx = (ws.contextJson as Record<string, unknown>) || {};
      return {
        entityType: ws.entityType,
        entityNumber: ws.entityNumber,
        status: ws.status,
        context: {
          summary: (ctx.summary as string) || ws.contextSummary || '',
          pendingActions: (ctx.pendingActions as string[]) || [],
        },
        resumeUrl: ws.resumeUrl,
        lastActivityAt: ws.lastActivityAt.toISOString(),
      };
    });

    // Try AI-powered response first, fall back to local
    let response: ContextAssistantResponse;

    try {
      // Try to use the AI provider if available
      const { getAIProvider } = await import('@/lib/ai/provider');
      const aiProvider = getAIProvider();
      const stats = aiProvider.getStats();
      const hasProvider = stats.some((s) => s.available);

      if (hasProvider) {
        const prompt = buildContextPrompt(
          { userId: session.user.id, currentPage, currentEntityType, currentEntityId },
          query
        )
          .replace('{sessions}', JSON.stringify(serializedSessions, null, 2))
          .replace('{activities}', JSON.stringify(recentActivities.slice(0, 10), null, 2));

        const aiResult = await aiProvider.chat({
          messages: [
            { role: 'system', content: 'You are a Vietnamese-speaking MRP assistant. Always respond in valid JSON format.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          maxTokens: 1000,
        });

        // Parse AI response
        const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          response = {
            text: parsed.text || aiResult.content,
            actions: parsed.actions || [],
            suggestions: parsed.suggestions || [],
          };
        } else {
          response = {
            text: aiResult.content,
            actions: [],
            suggestions: [],
          };
        }
      } else {
        // No AI provider available - use local response
        response = buildLocalResponse(serializedSessions, intent);
      }
    } catch {
      // AI failed - use local response
      response = buildLocalResponse(serializedSessions, intent);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('POST /api/ai/context-assistant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
