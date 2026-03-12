// src/app/api/work-sessions/route.ts
// GET: List user's active/paused sessions
// POST: Start or resume a session

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getUserSessions,
  startSession,
  pauseSession,
  resumeSession,
  completeSession,
  updateSessionContext,
  updateWorkflowStep,
  trackActivity,
  getRecentActivities,
} from '@/lib/work-session/work-session-service';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessions = await getUserSessions(session.user.id);
    return NextResponse.json({ data: sessions });
  } catch (error) {
    console.error('GET /api/work-sessions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'start': {
        const result = await startSession(session.user.id, {
          entityType: body.entityType,
          entityId: body.entityId,
          entityNumber: body.entityNumber,
          resumeUrl: body.resumeUrl || '',
          workflowSteps: body.workflowSteps,
          currentStep: body.currentStep,
        });
        return NextResponse.json({ data: result }, { status: 201 });
      }

      case 'pause': {
        const result = await pauseSession(body.sessionId, session.user.id);
        if (!result) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }
        return NextResponse.json({ data: result });
      }

      case 'resume': {
        const result = await resumeSession(body.sessionId, session.user.id);
        return NextResponse.json({ data: result });
      }

      case 'complete': {
        const result = await completeSession(body.sessionId, session.user.id);
        if (!result) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }
        return NextResponse.json({ data: result });
      }

      case 'updateContext': {
        const result = await updateSessionContext(session.user.id, {
          sessionId: body.sessionId,
          context: body.context,
        });
        if (!result) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }
        return NextResponse.json({ data: result });
      }

      case 'updateWorkflow': {
        const result = await updateWorkflowStep(session.user.id, {
          sessionId: body.sessionId,
          workflowStep: body.workflowStep,
          workflowStepName: body.workflowStepName,
          workflowTotalSteps: body.workflowTotalSteps,
        });
        return NextResponse.json({ data: result });
      }

      case 'trackActivity': {
        const result = await trackActivity(session.user.id, {
          sessionId: body.sessionId,
          action: body.activityAction,
          description: body.description,
          metadata: body.metadata,
        });
        if (!result) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }
        return NextResponse.json({ data: result }, { status: 201 });
      }

      case 'recentActivities': {
        const result = await getRecentActivities(
          session.user.id,
          body.hours || 24,
          body.limit || 20
        );
        return NextResponse.json({ data: result });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('POST /api/work-sessions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
