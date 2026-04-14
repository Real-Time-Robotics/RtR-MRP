'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Send,
  CheckCircle,
  XCircle,
  Edit,
  FileText,
  Clock,
  User,
  Package,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PRDetailProps {
  prId: string;
}

interface PRDetailData {
  pr: {
    id: string;
    prNumber: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    estimatedTotal: string | number;
    requestDate: string;
    requiredDate: string;
    revisionNumber: number;
    requester?: { id: string; name: string | null; email: string } | null;
  };
  approval: {
    status: string;
    approvedBy?: { id: string; name: string | null } | null;
    approvedAt?: string | null;
    rejectedBy?: { id: string; name: string | null } | null;
    rejectedAt?: string | null;
    rejectionReason?: string | null;
  };
  conversion: {
    converted: boolean;
    purchaseOrder?: {
      id: string;
      poNumber: string;
      status: string;
    } | null;
  };
  lines: Array<{
    id: string;
    lineNumber: number;
    description: string | null;
    part?: { id: string; partNumber: string; name: string } | null;
    requestedQty: string | number;
    unit: string;
    estimatedPrice: string | number | null;
    lineStatus: string;
    notes: string | null;
  }>;
  history: Array<{
    id: string;
    action: string;
    details: string | null;
    fromStatus: string | null;
    toStatus: string | null;
    actor?: { id: string; name: string | null } | null;
    createdAt: string;
  }>;
}

export function PRDetail({ prId }: PRDetailProps) {
  const router = useRouter();
  const [data, setData] = useState<PRDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchasing/pr/${prId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Failed to load PR');
        return;
      }
      setData(json.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [prId]);

  const post = async (path: string, body?: unknown) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error ?? 'Action failed');
      return null;
    }
    return json.data;
  };

  const handleSubmit = async () => {
    if (!confirm('Submit this PR for approval?')) return;
    if (await post(`/api/purchasing/pr/${prId}/submit`)) {
      toast.success('PR submitted');
      load();
    }
  };
  const handleApprove = async () => {
    if (!confirm('Approve this PR?')) return;
    if (await post(`/api/purchasing/pr/${prId}/approve`, { notes: 'Approved' })) {
      toast.success('PR approved');
      load();
    }
  };
  const handleReject = async () => {
    if (rejectReason.trim().length < 10) {
      toast.error('Reason must be at least 10 characters');
      return;
    }
    if (await post(`/api/purchasing/pr/${prId}/reject`, { reason: rejectReason })) {
      toast.success('PR rejected');
      setRejectOpen(false);
      setRejectReason('');
      load();
    }
  };
  const handleConvert = async () => {
    if (!confirm('Convert this PR to a Purchase Order?')) return;
    const result = await post('/api/purchasing/pr/convert', {
      prIds: [prId],
      consolidate: true,
    });
    if (result) {
      toast.success(`Created ${result.count} PO(s)`);
      load();
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!data) return <div>PR not found</div>;

  const { pr, approval, conversion, lines, history } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">{pr.prNumber}</h1>
          <p className="text-muted-foreground">{pr.title}</p>
          {pr.revisionNumber > 1 && (
            <Badge variant="outline" className="mt-1">
              Revision #{pr.revisionNumber}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {pr.status === 'DRAFT' && (
            <>
              <Button variant="outline" onClick={() => router.push(`/purchasing/pr/${prId}/edit`)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button onClick={handleSubmit}>
                <Send className="mr-2 h-4 w-4" /> Submit
              </Button>
            </>
          )}
          {pr.status === 'PENDING' && (
            <>
              <Button variant="outline" onClick={() => setRejectOpen(true)}>
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </Button>
              <Button onClick={handleApprove}>
                <CheckCircle className="mr-2 h-4 w-4" /> Approve
              </Button>
            </>
          )}
          {pr.status === 'APPROVED' && !conversion.converted && (
            <Button onClick={handleConvert}>
              <FileText className="mr-2 h-4 w-4" /> Convert to PO
            </Button>
          )}
          {pr.status === 'REJECTED' && (
            <Button onClick={() => router.push(`/purchasing/pr/${prId}/edit`)}>
              <Edit className="mr-2 h-4 w-4" /> Revise &amp; Resubmit
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <Badge>{pr.status}</Badge>
            <p className="text-sm text-muted-foreground mt-1">Status</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(Number(pr.estimatedTotal))}</div>
            <p className="text-sm text-muted-foreground">Estimated Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {formatDate(pr.requiredDate, 'short')}
            </div>
            <p className="text-sm text-muted-foreground">Required Date</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {pr.requester?.name ?? '—'}
            </div>
            <p className="text-sm text-muted-foreground">Requester</p>
          </CardContent>
        </Card>
      </div>

      {approval.rejectionReason && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Rejection Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{approval.rejectionReason}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Rejected by {approval.rejectedBy?.name ?? '—'}
              {approval.rejectedAt
                ? ` on ${formatDate(approval.rejectedAt, 'medium')}`
                : ''}
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="lines">
        <TabsList>
          <TabsTrigger value="lines">Line Items ({lines.length})</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="lines">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Est. Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l) => {
                    const qty = Number(l.requestedQty) || 0;
                    const price = Number(l.estimatedPrice ?? 0);
                    return (
                      <TableRow key={l.id}>
                        <TableCell>{l.lineNumber}</TableCell>
                        <TableCell>{l.description ?? l.part?.name ?? '—'}</TableCell>
                        <TableCell className="text-right">{qty}</TableCell>
                        <TableCell>{l.unit}</TableCell>
                        <TableCell className="text-right">{formatCurrency(price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(qty * price)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{l.lineStatus}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {history.map((h) => (
                <div key={h.id} className="flex items-start gap-4 border-l-2 pl-4 pb-3">
                  <div className="flex-1">
                    <div className="font-medium">{h.action}</div>
                    {h.details && (
                      <div className="text-sm text-muted-foreground">{h.details}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {h.actor?.name ?? '—'} • {formatDate(h.createdAt, 'medium')}
                    </div>
                  </div>
                  {h.fromStatus && h.toStatus && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{h.fromStatus}</Badge>
                      <ArrowRight className="h-3 w-3" />
                      <Badge>{h.toStatus}</Badge>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <PipelineStep
                  label="PR Created"
                  sub={formatDate(pr.requestDate, 'short')}
                  icon={<Package className="h-6 w-6 text-white" />}
                  active
                />
                <PipelineConnector active={approval.status !== 'NOT_SUBMITTED'} />
                <PipelineStep
                  label="Approval"
                  sub={approval.status}
                  icon={<CheckCircle className="h-6 w-6 text-white" />}
                  active={approval.status === 'APPROVED'}
                  warn={approval.status === 'PENDING'}
                  danger={approval.status === 'REJECTED'}
                />
                <PipelineConnector active={conversion.converted} />
                <PipelineStep
                  label="PO Created"
                  sub={conversion.purchaseOrder?.poNumber ?? 'Pending'}
                  icon={<FileText className="h-6 w-6 text-white" />}
                  active={conversion.converted}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Purchase Request</DialogTitle>
            <DialogDescription>
              Please provide a reason (visible to the requester). Minimum 10 characters.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            placeholder="Reason for rejection…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject PR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PipelineStep({
  label,
  sub,
  icon,
  active,
  warn,
  danger,
}: {
  label: string;
  sub: string;
  icon: React.ReactNode;
  active?: boolean;
  warn?: boolean;
  danger?: boolean;
}) {
  const bg = danger
    ? 'bg-red-600'
    : warn
      ? 'bg-yellow-500'
      : active
        ? 'bg-green-600'
        : 'bg-gray-300';
  return (
    <div className="text-center">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${bg}`}>
        {icon}
      </div>
      <div className="mt-2 font-medium">{label}</div>
      <div className="text-sm text-muted-foreground">{sub}</div>
    </div>
  );
}

function PipelineConnector({ active }: { active: boolean }) {
  return (
    <div className="flex-1 h-1 mx-4 bg-gray-200">
      <div className={`h-full ${active ? 'bg-green-600' : ''}`} style={{ width: active ? '100%' : '0%' }} />
    </div>
  );
}
