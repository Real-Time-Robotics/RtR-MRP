'use client';

import { useState } from 'react';
import { useWorkSessions } from '@/hooks/use-work-sessions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  X,
  Package,
  ShoppingCart,
  BarChart3,
  Wrench,
  Box,
  Cog,
  Factory,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { WorkSession } from '@/types/work-session';

const ENTITY_ICONS: Record<string, React.ElementType> = {
  PO: Package,
  SO: ShoppingCart,
  MRP_RUN: BarChart3,
  WORK_ORDER: Wrench,
  INVENTORY: Box,
  PART: Cog,
  BOM: Factory,
};

const ENTITY_COLORS: Record<string, string> = {
  PO: 'border-l-blue-500',
  SO: 'border-l-emerald-500',
  MRP_RUN: 'border-l-purple-500',
  WORK_ORDER: 'border-l-orange-500',
  INVENTORY: 'border-l-cyan-500',
  PART: 'border-l-slate-500',
  BOM: 'border-l-rose-500',
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.floor(hours / 24);
  return `${days} ngày`;
}

interface SessionCardProps {
  session: WorkSession;
  onPause?: () => void;
  onResume?: () => void;
  onNavigate: () => void;
  compact?: boolean;
}

function SessionCard({ session, onPause, onResume, onNavigate, compact }: SessionCardProps) {
  const Icon = ENTITY_ICONS[session.entityType] || FileText;
  const borderColor = ENTITY_COLORS[session.entityType] || 'border-l-gray-500';
  const timeAgo = formatTimeAgo(session.lastActivityAt);

  if (compact) {
    return (
      <div
        className="flex items-center justify-between p-2 bg-muted/50 rounded-md mb-1 cursor-pointer hover:bg-muted transition-colors"
        onClick={onNavigate}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">{session.entityNumber}</span>
          <span className="text-xs text-muted-foreground shrink-0">{timeAgo}</span>
        </div>
        {onResume && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onResume();
            }}
          >
            <Play className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  const ctx = session.context;

  return (
    <Card
      className={`p-3 mb-2 border-l-4 ${borderColor} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={onNavigate}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-semibold text-sm truncate">{session.entityNumber}</span>
          </div>
          {session.workflowStepName && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {session.workflowStepName} (b{'\u01B0\u1EDB'}c {session.workflowStep}/{session.workflowTotalSteps})
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{timeAgo}</span>
      </div>

      {ctx.summary && (
        <p className="text-xs text-foreground/80 mb-1.5">{ctx.summary}</p>
      )}

      {ctx.completedActions && ctx.completedActions.length > 0 && (
        <div className="text-xs text-muted-foreground mb-1.5">
          <span className="font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            {'\u0110\u00e3 l\u00e0m:'}
          </span>
          <ul className="list-disc list-inside ml-4 mt-0.5">
            {ctx.completedActions.slice(-3).map((action, i) => (
              <li key={i} className="truncate">{action}</li>
            ))}
          </ul>
        </div>
      )}

      {ctx.pendingActions && ctx.pendingActions.length > 0 && (
        <div className="text-xs text-primary mb-1.5">
          <span className="font-medium">{`C\u1EA7n l\u00e0m:`}</span>
          <ul className="list-disc list-inside ml-4 mt-0.5">
            {ctx.pendingActions.slice(0, 2).map((action, i) => (
              <li key={i} className="truncate">{action}</li>
            ))}
          </ul>
        </div>
      )}

      {ctx.blockers && ctx.blockers.length > 0 && (
        <div className="text-xs text-destructive mb-1.5 flex items-start gap-1">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{ctx.blockers[0]}</span>
        </div>
      )}

      <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" className="flex-1 h-7 text-xs" onClick={onNavigate}>
          <Play className="h-3 w-3 mr-1" />
          {`Ti\u1EBFp t\u1EE5c`}
        </Button>
        {onPause && (
          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={onPause}>
            <Pause className="h-3 w-3" />
          </Button>
        )}
      </div>
    </Card>
  );
}

export function WorkSessionPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const {
    activeSessions,
    pausedSessions,
    isLoading,
    pauseSession,
    resumeSession,
    navigateToSession,
  } = useWorkSessions();

  const totalCount = activeSessions.length + pausedSessions.length;

  // Don't render if no sessions or dismissed
  if (isDismissed || (!isLoading && totalCount === 0)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <Card className="shadow-lg border">
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2.5 bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors rounded-t-lg"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">{`Phi\u00EAn l\u00E0m vi\u1EC7c`}</span>
            {totalCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {totalCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isCollapsed ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissed(true);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="p-3 max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="ml-2 text-xs text-muted-foreground">{`\u0110ang t\u1EA3i...`}</span>
              </div>
            ) : (
              <>
                {/* Active Sessions */}
                {activeSessions.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {`\u0110ang l\u00E0m`}
                      </span>
                    </div>
                    {activeSessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        onPause={() => pauseSession(session.id)}
                        onNavigate={() => navigateToSession(session)}
                      />
                    ))}
                  </div>
                )}

                {/* Paused Sessions */}
                {pausedSessions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Pause className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {`T\u1EA1m d\u1EEBng (${pausedSessions.length})`}
                      </span>
                    </div>
                    {pausedSessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        onResume={() => resumeSession(session.id)}
                        onNavigate={() => navigateToSession(session)}
                        compact
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
