'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, Package, Clock, FileText, Loader2, CheckCircle, XCircle, Eye, Send, Wrench, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { NCRStatusBadge } from '@/components/quality/ncr-status-badge';
import { PriorityBadge } from '@/components/quality/priority-badge';
import { EntityTooltip } from '@/components/entity-tooltip';

interface NCRDetail {
  id: string;
  ncrNumber: string;
  status: string;
  priority: string;
  source: string;
  title: string;
  description: string;
  defectCode: string | null;
  defectCategory: string | null;
  lotNumber: string | null;
  quantityAffected: number;
  preliminaryCause: string | null;
  containmentAction: string | null;
  disposition: string | null;
  dispositionReason: string | null;
  dispositionApprovedBy: string | null;
  dispositionApprovedAt: string | null;
  reworkInstructions: string | null;
  closureNotes: string | null;
  closedBy: string | null;
  closedAt: string | null;
  capaId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  part?: { id: string; partNumber: string; name: string } | null;
  product?: { sku: string; name: string } | null;
  workOrder?: { woNumber: string } | null;
  inspection?: { inspectionNumber: string } | null;
  capa?: { capaNumber: string } | null;
  history: Array<{
    id: string;
    action: string;
    fromStatus: string | null;
    toStatus: string | null;
    comment: string | null;
    userId: string;
    createdAt: string;
  }>;
}

interface WorkflowAction {
  action: string;
  label: string;
  icon: React.ReactNode;
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
  requiresInput?: string;
}

const STATUS_ACTIONS: Record<string, WorkflowAction[]> = {
  open: [
    { action: 'START_REVIEW', label: 'Bắt đầu xem xét', icon: <Eye className="h-4 w-4" />, variant: 'default' },
    { action: 'VOID_NCR', label: 'Hủy NCR', icon: <XCircle className="h-4 w-4" />, variant: 'destructive' },
  ],
  under_review: [
    { action: 'SUBMIT_FOR_DISPOSITION', label: 'Gửi xử lý', icon: <Send className="h-4 w-4" />, variant: 'default', requiresInput: 'disposition_fields' },
    { action: 'VOID_NCR', label: 'Hủy NCR', icon: <XCircle className="h-4 w-4" />, variant: 'destructive' },
  ],
  pending_disposition: [
    { action: 'APPROVE_DISPOSITION', label: 'Duyệt xử lý', icon: <CheckCircle className="h-4 w-4" />, variant: 'default', requiresInput: 'approve_fields' },
    { action: 'VOID_NCR', label: 'Hủy NCR', icon: <XCircle className="h-4 w-4" />, variant: 'destructive' },
  ],
  disposition_approved: [
    { action: 'START_REWORK', label: 'Bắt đầu sửa', icon: <Wrench className="h-4 w-4" />, variant: 'default' },
    { action: 'COMPLETE_DISPOSITION', label: 'Hoàn thành', icon: <CheckCircle className="h-4 w-4" />, variant: 'default' },
  ],
  in_rework: [
    { action: 'COMPLETE_REWORK', label: 'Hoàn thành sửa', icon: <CheckCircle className="h-4 w-4" />, variant: 'default' },
  ],
  pending_verification: [
    { action: 'VERIFY_REWORK', label: 'Xác nhận kết quả', icon: <ClipboardCheck className="h-4 w-4" />, variant: 'default' },
  ],
  completed: [
    { action: 'CLOSE_NCR', label: 'Đóng NCR', icon: <CheckCircle className="h-4 w-4" />, variant: 'secondary' },
  ],
};

const ACTION_LABELS: Record<string, string> = {
  START_REVIEW: 'Bắt đầu xem xét',
  SUBMIT_FOR_DISPOSITION: 'Gửi xử lý',
  APPROVE_DISPOSITION: 'Duyệt xử lý',
  START_REWORK: 'Bắt đầu sửa chữa',
  COMPLETE_DISPOSITION: 'Hoàn thành xử lý',
  COMPLETE_REWORK: 'Hoàn thành sửa chữa',
  VERIFY_REWORK: 'Xác nhận kết quả sửa',
  CLOSE_NCR: 'Đóng NCR',
  VOID_NCR: 'Hủy NCR',
  STATUS_CHANGE: 'Thay đổi trạng thái',
};

const DISPOSITION_LABELS: Record<string, string> = {
  USE_AS_IS: 'Sử dụng nguyên trạng',
  REWORK: 'Sửa chữa lại',
  REPAIR: 'Sửa chữa',
  RETURN_TO_VENDOR: 'Trả nhà cung cấp',
  SCRAP: 'Phế phẩm',
  SORT: 'Phân loại',
};

export default function NCRDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ncr, setNCR] = useState<NCRDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Editable fields
  const [preliminaryCause, setPreliminaryCause] = useState('');
  const [containmentAction, setContainmentAction] = useState('');
  const [disposition, setDisposition] = useState('');
  const [dispositionReason, setDispositionReason] = useState('');
  const [reworkInstructions, setReworkInstructions] = useState('');
  const [closureNotes, setClosureNotes] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/quality/ncr/${params.id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('NCR không tồn tại');
        throw new Error('Lỗi tải dữ liệu');
      }
      const data = await res.json();
      setNCR(data);
      // Populate editable fields
      setPreliminaryCause(data.preliminaryCause || '');
      setContainmentAction(data.containmentAction || '');
      setDisposition(data.disposition || '');
      setDispositionReason(data.dispositionReason || '');
      setReworkInstructions(data.reworkInstructions || '');
      setClosureNotes(data.closureNotes || '');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Lỗi tải NCR');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (action: string, label: string) => {
    if (!confirm(`Bạn có chắc muốn: "${label}"?`)) return;
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = { action };

      // Include required fields based on action
      if (action === 'SUBMIT_FOR_DISPOSITION') {
        if (!preliminaryCause || !containmentAction) {
          toast.error('Vui lòng nhập nguyên nhân sơ bộ và hành động khắc phục');
          setActionLoading(false);
          return;
        }
        body.preliminaryCause = preliminaryCause;
        body.containmentAction = containmentAction;
      }
      if (action === 'APPROVE_DISPOSITION') {
        if (!disposition || !dispositionReason) {
          toast.error('Vui lòng chọn phương án xử lý và lý do');
          setActionLoading(false);
          return;
        }
        body.disposition = disposition;
        body.dispositionReason = dispositionReason;
      }
      if (action === 'START_REWORK') {
        if (!reworkInstructions) {
          toast.error('Vui lòng nhập hướng dẫn sửa chữa');
          setActionLoading(false);
          return;
        }
        body.reworkInstructions = reworkInstructions;
      }
      if (action === 'CLOSE_NCR') {
        if (!closureNotes) {
          toast.error('Vui lòng nhập ghi chú đóng NCR');
          setActionLoading(false);
          return;
        }
        body.closureNotes = closureNotes;
      }

      const res = await fetch(`/api/quality/ncr/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi cập nhật NCR');
      }
      toast.success(`NCR đã được cập nhật: "${label}"`);
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Lỗi cập nhật NCR');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveFields = async () => {
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = {};
      if (preliminaryCause !== (ncr?.preliminaryCause || '')) body.preliminaryCause = preliminaryCause;
      if (containmentAction !== (ncr?.containmentAction || '')) body.containmentAction = containmentAction;
      if (disposition !== (ncr?.disposition || '')) body.disposition = disposition;
      if (dispositionReason !== (ncr?.dispositionReason || '')) body.dispositionReason = dispositionReason;
      if (reworkInstructions !== (ncr?.reworkInstructions || '')) body.reworkInstructions = reworkInstructions;
      if (closureNotes !== (ncr?.closureNotes || '')) body.closureNotes = closureNotes;

      if (Object.keys(body).length === 0) {
        toast.info('Không có thay đổi');
        setActionLoading(false);
        return;
      }

      const res = await fetch(`/api/quality/ncr/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi lưu');
      }
      toast.success('Đã lưu thay đổi');
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Lỗi lưu');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ncr) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold">NCR không tồn tại</h2>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">Quay lại</Button>
      </div>
    );
  }

  const availableActions = STATUS_ACTIONS[ncr.status] || [];
  const isEditable = !['closed', 'voided'].includes(ncr.status);

  return (
    <div className="space-y-6 container mx-auto max-w-5xl py-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {ncr.ncrNumber}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <NCRStatusBadge status={ncr.status} />
            <PriorityBadge priority={ncr.priority} />
            <span className="text-muted-foreground text-sm">
              {format(new Date(ncr.createdAt), 'dd/MM/yyyy HH:mm')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {availableActions.map((wa) => (
            <Button
              key={wa.action}
              variant={wa.variant}
              size="sm"
              disabled={actionLoading}
              onClick={() => handleAction(wa.action, wa.label)}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <span className="mr-1">{wa.icon}</span>}
              {wa.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Main content */}
        <div className="space-y-6 col-span-2">
          {/* Title & Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Thông tin NCR
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Tiêu đề</p>
                <p className="font-medium">{ncr.title}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Mô tả chi tiết</p>
                <p className="text-sm whitespace-pre-wrap">{ncr.description}</p>
              </div>
              {ncr.defectCategory && (
                <>
                  <Separator />
                  <div className="flex gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Loại lỗi</p>
                      <Badge variant="outline">{ncr.defectCategory}</Badge>
                    </div>
                    {ncr.defectCode && (
                      <div>
                        <p className="text-sm text-muted-foreground">Mã lỗi</p>
                        <Badge variant="outline">{ncr.defectCode}</Badge>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Investigation & Disposition */}
          {isEditable && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Điều tra & Xử lý
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nguyên nhân sơ bộ</label>
                  <Textarea
                    value={preliminaryCause}
                    onChange={(e) => setPreliminaryCause(e.target.value)}
                    placeholder="Phân tích nguyên nhân ban đầu..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Hành động khắc phục tạm thời</label>
                  <Textarea
                    value={containmentAction}
                    onChange={(e) => setContainmentAction(e.target.value)}
                    placeholder="Biện pháp khắc phục tạm thời..."
                    className="mt-1"
                  />
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Phương án xử lý</label>
                    <select
                      value={disposition}
                      onChange={(e) => setDisposition(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Chọn phương án</option>
                      {Object.entries(DISPOSITION_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Lý do xử lý</label>
                    <Textarea
                      value={dispositionReason}
                      onChange={(e) => setDispositionReason(e.target.value)}
                      placeholder="Lý do chọn phương án này..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                </div>
                {(['disposition_approved', 'in_rework'].includes(ncr.status)) && (
                  <div>
                    <label className="text-sm font-medium">Hướng dẫn sửa chữa</label>
                    <Textarea
                      value={reworkInstructions}
                      onChange={(e) => setReworkInstructions(e.target.value)}
                      placeholder="Chi tiết hướng dẫn sửa chữa..."
                      className="mt-1"
                    />
                  </div>
                )}
                {ncr.status === 'completed' && (
                  <div>
                    <label className="text-sm font-medium">Ghi chú đóng NCR</label>
                    <Textarea
                      value={closureNotes}
                      onChange={(e) => setClosureNotes(e.target.value)}
                      placeholder="Kết luận và ghi chú khi đóng NCR..."
                      className="mt-1"
                    />
                  </div>
                )}
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={handleSaveFields} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Lưu thay đổi
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Read-only disposition info for closed/voided */}
          {!isEditable && (ncr.disposition || ncr.closureNotes) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kết quả xử lý</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {ncr.disposition && (
                  <div>
                    <span className="text-muted-foreground">Phương án: </span>
                    <Badge variant="outline">{DISPOSITION_LABELS[ncr.disposition] || ncr.disposition}</Badge>
                  </div>
                )}
                {ncr.dispositionReason && <div><span className="text-muted-foreground">Lý do: </span>{ncr.dispositionReason}</div>}
                {ncr.reworkInstructions && <div><span className="text-muted-foreground">Hướng dẫn sửa: </span>{ncr.reworkInstructions}</div>}
                {ncr.closureNotes && <div><span className="text-muted-foreground">Ghi chú đóng: </span>{ncr.closureNotes}</div>}
              </CardContent>
            </Card>
          )}

          {/* History */}
          {ncr.history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Lịch sử ({ncr.history.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ncr.history.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">
                          {ACTION_LABELS[h.action] || h.action}
                        </p>
                        {h.fromStatus && h.toStatus && (
                          <p className="text-muted-foreground text-xs">
                            {h.fromStatus} → {h.toStatus}
                          </p>
                        )}
                        {h.comment && <p className="text-muted-foreground">{h.comment}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(h.createdAt), 'dd/MM HH:mm')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Meta Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Thông tin sản phẩm
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nguồn phát hiện</span>
                <Badge variant="outline">{ncr.source}</Badge>
              </div>
              {ncr.part && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Part</span>
                  <EntityTooltip type="part" id={ncr.part.id}>
                    <span className="font-mono cursor-help">{ncr.part.partNumber}</span>
                  </EntityTooltip>
                </div>
              )}
              {ncr.part?.name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tên</span>
                  <span className="text-right max-w-[180px] truncate">{ncr.part.name}</span>
                </div>
              )}
              {ncr.product && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product</span>
                  <span className="font-mono">{ncr.product.sku}</span>
                </div>
              )}
              {ncr.lotNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lot/Batch</span>
                  <span className="font-mono text-xs">{ncr.lotNumber}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">SL ảnh hưởng</span>
                <span className="font-bold text-red-600">{ncr.quantityAffected}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Liên kết
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {ncr.inspection && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inspection</span>
                  <span className="font-mono">{ncr.inspection.inspectionNumber}</span>
                </div>
              )}
              {ncr.workOrder && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Work Order</span>
                  <span className="font-mono">{ncr.workOrder.woNumber}</span>
                </div>
              )}
              {ncr.capa && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CAPA</span>
                  <span className="font-mono">{ncr.capa.capaNumber}</span>
                </div>
              )}
              {!ncr.inspection && !ncr.workOrder && !ncr.capa && (
                <p className="text-muted-foreground italic">Không có liên kết</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thông tin tạo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ngày tạo</span>
                <span>{format(new Date(ncr.createdAt), 'dd/MM/yyyy HH:mm')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cập nhật</span>
                <span>{format(new Date(ncr.updatedAt), 'dd/MM/yyyy HH:mm')}</span>
              </div>
              {ncr.closedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Đóng lúc</span>
                  <span>{format(new Date(ncr.closedAt), 'dd/MM/yyyy HH:mm')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
