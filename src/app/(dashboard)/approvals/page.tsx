'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PendingApprovals, WorkflowTimeline } from '@/components/workflow';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  History,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface WorkflowInstance {
  id: string;
  entityType: string;
  entityId: string;
  status: string;
  currentStepNumber: number;
  startedAt: string;
  completedAt: string | null;
  workflow: {
    name: string;
    code: string;
  };
  initiatedByUser: {
    name: string | null;
    email: string;
  };
  _count: {
    approvals: number;
  };
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  PENDING: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  IN_PROGRESS: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
  APPROVED: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  REJECTED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  CANCELLED: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-100' },
  ESCALATED: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100' },
};

export default function ApprovalsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [myWorkflows, setMyWorkflows] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      // Get current user
      try {
        const sessionRes = await fetch('/api/auth/session');
        if (sessionRes.ok) {
          const session = await sessionRes.json();
          if (session?.user?.id) {
            setUserId(session.user.id);

            // Fetch user's initiated workflows
            const workflowsRes = await fetch(`/api/workflows?userId=${session.user.id}&limit=50`);
            if (workflowsRes.ok) {
              const data = await workflowsRes.json();
              setMyWorkflows(data.instances || []);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const pendingCount = myWorkflows.filter(w => w.status === 'PENDING' || w.status === 'IN_PROGRESS').length;
  const completedCount = myWorkflows.filter(w => w.status === 'APPROVED').length;
  const rejectedCount = myWorkflows.filter(w => w.status === 'REJECTED').length;

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Workflow Approvals</h1>
          <p className="text-sm text-muted-foreground">
            Manage your pending approvals and track workflow status
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge variant="secondary">{pendingCount} Pending</Badge>
          )}
          {completedCount > 0 && (
            <Badge variant="default" className="bg-green-600">{completedCount} Approved</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending Approvals
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-workflows" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            My Workflows
          </TabsTrigger>
          {selectedInstance && (
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Timeline
            </TabsTrigger>
          )}
        </TabsList>

        {/* Pending Approvals Tab */}
        <TabsContent value="pending">
          {userId ? (
            <PendingApprovals userId={userId} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Please log in to view your pending approvals
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* My Workflows Tab */}
        <TabsContent value="my-workflows">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Workflows I Initiated
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myWorkflows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No workflows initiated yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myWorkflows.map((workflow) => {
                    const config = statusConfig[workflow.status] || statusConfig.PENDING;
                    const StatusIcon = config.icon;

                    return (
                      <div
                        key={workflow.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedInstance(workflow.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${config.bg}`}>
                            <StatusIcon className={`w-4 h-4 ${config.color}`} />
                          </div>
                          <div>
                            <p className="font-medium">{workflow.workflow.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {workflow.entityType}: {workflow.entityId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Started {formatDistanceToNow(new Date(workflow.startedAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={
                              workflow.status === 'APPROVED'
                                ? 'default'
                                : workflow.status === 'REJECTED'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {workflow.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Step {workflow.currentStepNumber}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          {selectedInstance ? (
            <WorkflowTimeline instanceId={selectedInstance} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Select a workflow to view its timeline
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
