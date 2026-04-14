'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MoreHorizontal, Eye, Send, CheckCircle, XCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PRRow {
  id: string;
  prNumber: string;
  title: string;
  status: string;
  priority: string;
  estimatedTotal: string | number;
  requiredDate: string;
  requestDate: string;
  requester?: { id: string; name: string | null } | null;
  _count?: { lines: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-500 hover:bg-gray-500',
  PENDING: 'bg-yellow-500 hover:bg-yellow-500',
  APPROVED: 'bg-green-600 hover:bg-green-600',
  REJECTED: 'bg-red-600 hover:bg-red-600',
  REVISED: 'bg-blue-500 hover:bg-blue-500',
  CANCELLED: 'bg-gray-400 hover:bg-gray-400',
  PO_CREATED: 'bg-purple-600 hover:bg-purple-600',
  PARTIALLY_ORDERED: 'bg-purple-400 hover:bg-purple-400',
  COMPLETED: 'bg-emerald-700 hover:bg-emerald-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'border-gray-400 text-gray-600',
  NORMAL: 'border-blue-400 text-blue-600',
  HIGH: 'border-orange-500 text-orange-600',
  URGENT: 'border-red-500 text-red-600',
  CRITICAL: 'border-red-700 text-red-700 font-bold',
};

export function PRList() {
  const router = useRouter();
  const [rows, setRows] = useState<PRRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const fetchPage = async (page: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchasing/pr?page=${page}&limit=20`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Failed to load PRs');
        return;
      }
      setRows(json.data.items ?? []);
      setPagination(json.data.pagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(1);
  }, []);

  const post = async (path: string, body?: unknown) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error ?? 'Action failed');
      return false;
    }
    return json.data;
  };

  const handleSubmit = async (id: string) => {
    if (!confirm('Submit this PR for approval?')) return;
    if (await post(`/api/purchasing/pr/${id}/submit`)) {
      toast.success('PR submitted');
      fetchPage(pagination.page);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this PR?')) return;
    if (await post(`/api/purchasing/pr/${id}/approve`, { notes: 'Approved' })) {
      toast.success('PR approved');
      fetchPage(pagination.page);
    }
  };

  const handleConvert = async (id: string) => {
    if (!confirm('Convert this PR to Purchase Order?')) return;
    const result = await post('/api/purchasing/pr/convert', {
      prIds: [id],
      consolidate: true,
    });
    if (result) {
      toast.success(`Created ${result.count} PO(s)`);
      fetchPage(pagination.page);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchase Requests</h1>
          <p className="text-sm text-muted-foreground">
            {pagination.total} total • Page {pagination.page} of {pagination.totalPages}
          </p>
        </div>
        <Button onClick={() => router.push('/purchasing/pr/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New PR
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PR Number</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Est. Total</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead className="text-right">Lines</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No purchase requests yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono font-medium">{r.prNumber}</TableCell>
                  <TableCell className="max-w-[260px] truncate">{r.title}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[r.status] ?? 'bg-gray-500'}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={PRIORITY_COLORS[r.priority]}>
                      {r.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(r.estimatedTotal ?? 0))}
                  </TableCell>
                  <TableCell>{formatDate(r.requiredDate, 'short')}</TableCell>
                  <TableCell>{r.requester?.name ?? '—'}</TableCell>
                  <TableCell className="text-right">{r._count?.lines ?? 0}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/purchasing/pr/${r.id}`)}>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        {r.status === 'DRAFT' && (
                          <DropdownMenuItem onClick={() => handleSubmit(r.id)}>
                            <Send className="mr-2 h-4 w-4" /> Submit
                          </DropdownMenuItem>
                        )}
                        {r.status === 'PENDING' && (
                          <>
                            <DropdownMenuItem onClick={() => handleApprove(r.id)}>
                              <CheckCircle className="mr-2 h-4 w-4" /> Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/purchasing/pr/${r.id}`)}>
                              <XCircle className="mr-2 h-4 w-4" /> Reject…
                            </DropdownMenuItem>
                          </>
                        )}
                        {r.status === 'APPROVED' && (
                          <DropdownMenuItem onClick={() => handleConvert(r.id)}>
                            <FileText className="mr-2 h-4 w-4" /> Convert to PO
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => fetchPage(pagination.page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchPage(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
