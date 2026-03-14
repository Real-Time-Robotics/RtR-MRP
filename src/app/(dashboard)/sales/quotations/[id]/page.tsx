'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Send, Check, X, FileText, Edit } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  sent: 'bg-blue-500',
  accepted: 'bg-green-500',
  rejected: 'bg-red-500',
  expired: 'bg-yellow-500',
  converted: 'bg-purple-500',
};

const statusLabels: Record<string, string> = {
  draft: 'Nháp',
  sent: 'Đã gửi',
  accepted: 'Chấp nhận',
  rejected: 'Từ chối',
  expired: 'Hết hạn',
  converted: 'Đã chuyển đổi',
};

export default function QuotationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const fetchQuotation = useCallback(async () => {
    try {
      const res = await fetch(`/api/quotations/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setQuotation(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch quotation:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchQuotation();
  }, [fetchQuotation]);

  const handleAction = async (action: 'send' | 'accept' | 'convert') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/quotations/${params.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (data.success) {
        const messages: Record<string, string> = {
          send: 'Đã gửi báo giá cho khách hàng',
          accept: `Đã tạo đơn hàng ${data.data?.orderNumber || ''}`,
          convert: `Đã chuyển đổi thành đơn hàng ${data.data?.orderNumber || ''}`,
        };
        toast.success(messages[action]);
        fetchQuotation();
      } else {
        toast.error(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/quotations/${params.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Đã từ chối báo giá');
        setRejectDialogOpen(false);
        setRejectReason('');
        fetchQuotation();
      } else {
        toast.error(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Đang tải...</div>;
  }

  if (!quotation) {
    return <div className="flex items-center justify-center h-64">Không tìm thấy báo giá</div>;
  }

  const canEdit = quotation.status === 'draft';
  const canSend = quotation.status === 'draft';
  const canAccept = quotation.status === 'sent';
  const canConvert = quotation.status === 'sent' || quotation.status === 'accepted';
  const canReject = quotation.status === 'sent';

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/sales/quotations')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{quotation.quoteNumber}</h1>
            <p className="text-muted-foreground">{quotation.customer?.name}</p>
          </div>
          <Badge className={statusColors[quotation.status]}>
            {statusLabels[quotation.status] || quotation.status}
          </Badge>
        </div>

        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" onClick={() => router.push(`/sales/quotations/${params.id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Sửa
            </Button>
          )}
          {canSend && (
            <Button onClick={() => handleAction('send')} disabled={actionLoading}>
              <Send className="mr-2 h-4 w-4" />
              Gửi khách hàng
            </Button>
          )}
          {canAccept && (
            <Button onClick={() => handleAction('accept')} disabled={actionLoading}>
              <Check className="mr-2 h-4 w-4" />
              Chấp nhận &amp; Tạo SO
            </Button>
          )}
          {canConvert && (
            <Button variant="secondary" onClick={() => handleAction('convert')} disabled={actionLoading}>
              <FileText className="mr-2 h-4 w-4" />
              Chuyển thành SO
            </Button>
          )}
          {canReject && (
            <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={actionLoading}>
                  <X className="mr-2 h-4 w-4" />
                  Từ chối
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Từ chối báo giá?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Nhập lý do từ chối báo giá này.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <Label htmlFor="reject-reason">Lý do từ chối</Label>
                  <Input
                    id="reject-reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Nhập lý do..."
                    className="mt-2"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReject} disabled={actionLoading}>
                    Từ chối
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tổng tiền</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(quotation.totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hiệu lực đến</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatDate(quotation.validUntil)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Số sản phẩm</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{quotation.items?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết sản phẩm</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sản phẩm</TableHead>
                <TableHead className="text-right">Số lượng</TableHead>
                <TableHead className="text-right">Đơn giá</TableHead>
                <TableHead className="text-right">Giảm giá</TableHead>
                <TableHead className="text-right">Thành tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotation.items?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.part?.name || item.partId}</p>
                      <p className="text-sm text-muted-foreground">{item.part?.partNumber}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right">{item.discountPercent}%</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.lineTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tạm tính:</span>
                <span>{formatCurrency(quotation.subtotal)}</span>
              </div>
              {quotation.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Giảm giá:</span>
                  <span>-{formatCurrency(quotation.discountAmount)}</span>
                </div>
              )}
              {quotation.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Thuế:</span>
                  <span>{formatCurrency(quotation.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Tổng cộng:</span>
                <span>{formatCurrency(quotation.totalAmount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {quotation.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Ghi chú</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{quotation.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Linked SO */}
      {quotation.salesOrder && (
        <Card>
          <CardHeader>
            <CardTitle>Đơn hàng liên kết</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => router.push(`/orders/${quotation.salesOrder.id}`)}
              >
                {quotation.salesOrder.orderNumber}
              </Button>
              <Badge variant="outline">{quotation.salesOrder.status}</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
