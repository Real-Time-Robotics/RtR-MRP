'use client';

// =============================================================================
// AUTO-PO DETAIL PAGE - Full suggestion details with AI reasoning
// Includes alternative suppliers, risk analysis, modification form
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Package,
  Building2,
  Calendar,
  DollarSign,
  AlertTriangle,
  Check,
  X,
  Edit,
  Send,
  Clock,
  User,
  FileText,
  TrendingUp,
  Shield,
  Loader2,
} from 'lucide-react';
import {
  AIReasoningPanel,
  ConfidenceIndicator,
  POComparison,
  POSuggestion,
} from '@/components/ai/auto-po';
import { formatCurrency, formatDate } from '@/lib/utils';

interface SuggestionDetail extends POSuggestion {
  keyFactors?: Array<{
    type: 'positive' | 'negative' | 'neutral' | 'warning';
    label: string;
    description: string;
    impact?: 'high' | 'medium' | 'low';
  }>;
  dataSources?: Array<{
    name: string;
    description: string;
    lastUpdated?: string;
  }>;
  alternativeSuppliers?: Array<{
    supplierId: string;
    supplierName: string;
    unitPrice: number;
    leadTimeDays: number;
    score: number;
    isRecommended?: boolean;
    isCurrentSupplier?: boolean;
    pros?: string[];
    cons?: string[];
  }>;
  riskAnalysis?: {
    level: 'high' | 'medium' | 'low';
    factors: Array<{
      name: string;
      severity: 'high' | 'medium' | 'low';
      description: string;
      mitigation?: string;
    }>;
  };
  auditTrail?: Array<{
    action: string;
    userId: string;
    userName: string;
    timestamp: string;
    notes?: string;
  }>;
}

export default function AutoPODetailPage() {
  const router = useRouter();
  const params = useParams();
  const suggestionId = params.suggestionId as string;
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [suggestion, setSuggestion] = useState<SuggestionDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Modification form state
  const [modifications, setModifications] = useState({
    quantity: 0,
    unitPrice: 0,
    supplierId: '',
    supplierName: '',
    expectedDeliveryDate: '',
    notes: '',
  });

  // Fetch suggestion details
  const fetchSuggestion = useCallback(async () => {
    try {
      const res = await fetch(`/api/ai/auto-po/queue/${suggestionId}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestion(data.item);
        setModifications({
          quantity: data.item.quantity,
          unitPrice: data.item.unitPrice,
          supplierId: data.item.supplierId,
          supplierName: data.item.supplierName,
          expectedDeliveryDate: data.item.expectedDeliveryDate || '',
          notes: '',
        });
      } else {
        throw new Error('Failed to fetch');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin đề xuất',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [suggestionId, toast]);

  useEffect(() => {
    fetchSuggestion();
  }, [fetchSuggestion]);

  // Handlers
  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = { queueItemId: suggestionId };
      if (isEditing) {
        body.modifications = {
          quantity: modifications.quantity,
          unitPrice: modifications.unitPrice,
          supplierId: modifications.supplierId,
          supplierName: modifications.supplierName,
          expectedDeliveryDate: modifications.expectedDeliveryDate,
        };
        body.notes = modifications.notes;
      }

      const res = await fetch('/api/ai/auto-po/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast({
          title: 'Thành công',
          description: 'Đề xuất PO đã được phê duyệt',
        });
        router.push('/ai/auto-po');
      } else {
        throw new Error('Failed to approve');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể phê duyệt đề xuất',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập lý do từ chối',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/ai/auto-po/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueItemId: suggestionId,
          reason: rejectReason,
        }),
      });

      if (res.ok) {
        toast({
          title: 'Đã từ chối',
          description: 'Đề xuất PO đã bị từ chối',
        });
        setRejectDialogOpen(false);
        router.push('/ai/auto-po');
      } else {
        throw new Error('Failed to reject');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể từ chối đề xuất',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecute = async () => {
    if (suggestion?.status !== 'approved') {
      toast({
        title: 'Lỗi',
        description: 'Chỉ có thể thực hiện đề xuất đã được phê duyệt',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/ai/auto-po/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueItemId: suggestionId }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: 'Thành công',
          description: `Đã tạo PO ${data.purchaseOrder?.id}`,
        });
        fetchSuggestion();
      } else {
        throw new Error('Failed to execute');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo Purchase Order',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectSupplier = (supplierId: string) => {
    const supplier = suggestion?.alternativeSuppliers?.find(s => s.supplierId === supplierId);
    if (supplier) {
      setModifications({
        ...modifications,
        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName,
        unitPrice: supplier.unitPrice,
      });
      setIsEditing(true);
    }
  };

  if (loading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[200px]" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[200px]" />
            <Skeleton className="h-[150px]" />
          </div>
        </div>
      </div>
    );
  }

  if (!suggestion) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Không tìm thấy đề xuất</p>
            <Button variant="outline" className="mt-4" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalAmount = isEditing
    ? modifications.quantity * modifications.unitPrice
    : suggestion.totalAmount;

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Quay lại">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{suggestion.partNumber}</h1>
              <Badge
                variant={
                  suggestion.status === 'approved'
                    ? 'default'
                    : suggestion.status === 'rejected'
                    ? 'destructive'
                    : suggestion.status === 'executed'
                    ? 'secondary'
                    : 'outline'
                }
              >
                {suggestion.status === 'approved'
                  ? 'Đã duyệt'
                  : suggestion.status === 'rejected'
                  ? 'Từ chối'
                  : suggestion.status === 'executed'
                  ? 'Đã thực hiện'
                  : 'Chờ duyệt'}
              </Badge>
            </div>
            <p className="text-muted-foreground">{suggestion.partName}</p>
          </div>
        </div>
        <ConfidenceIndicator
          score={suggestion.confidence}
          size="lg"
          breakdown={{
            demandScore: 0.85,
            supplierScore: 0.78,
            priceScore: 0.72,
            historyScore: 0.9,
          }}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Suggestion Details Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Chi tiết đề xuất
                </CardTitle>
                {suggestion.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Part Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Mã vật tư</Label>
                  <p className="font-medium">{suggestion.partNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Danh mục</Label>
                  <p className="font-medium">{suggestion.partCategory || 'N/A'}</p>
                </div>
              </div>

              <Separator />

              {/* Supplier & Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nhà cung cấp</Label>
                  {isEditing ? (
                    <Input
                      value={modifications.supplierName}
                      onChange={(e) =>
                        setModifications({ ...modifications, supplierName: e.target.value })
                      }
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{suggestion.supplierName}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Số lượng</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={modifications.quantity}
                      onChange={(e) =>
                        setModifications({
                          ...modifications,
                          quantity: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  ) : (
                    <p className="font-medium">{suggestion.quantity.toLocaleString()}</p>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Đơn giá</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={modifications.unitPrice}
                      onChange={(e) =>
                        setModifications({
                          ...modifications,
                          unitPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  ) : (
                    <p className="font-medium">{formatCurrency(suggestion.unitPrice)}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Tổng tiền</Label>
                  <p className="text-xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
                </div>
              </div>

              {/* Delivery Date */}
              <div className="space-y-2">
                <Label>Ngày giao dự kiến</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={modifications.expectedDeliveryDate}
                    onChange={(e) =>
                      setModifications({
                        ...modifications,
                        expectedDeliveryDate: e.target.value,
                      })
                    }
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {suggestion.expectedDeliveryDate
                        ? formatDate(suggestion.expectedDeliveryDate)
                        : 'Chưa xác định'}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes when editing */}
              {isEditing && (
                <div className="space-y-2">
                  <Label>Ghi chú chỉnh sửa</Label>
                  <Textarea
                    value={modifications.notes}
                    onChange={(e) =>
                      setModifications({ ...modifications, notes: e.target.value })
                    }
                    placeholder="Nhập lý do chỉnh sửa..."
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Reasoning Panel */}
          <AIReasoningPanel
            reasoning={suggestion.reason}
            shortSummary={suggestion.aiNotes}
            keyFactors={suggestion.keyFactors}
            dataSources={suggestion.dataSources}
            defaultExpanded
          />

          {/* Alternative Suppliers */}
          {suggestion.alternativeSuppliers && suggestion.alternativeSuppliers.length > 0 && (
            <POComparison
              partNumber={suggestion.partNumber}
              partName={suggestion.partName}
              quantity={isEditing ? modifications.quantity : suggestion.quantity}
              suppliers={suggestion.alternativeSuppliers}
              selectedSupplierId={isEditing ? modifications.supplierId : suggestion.supplierId}
              onSelectSupplier={handleSelectSupplier}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action Buttons */}
          {suggestion.status === 'pending' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hành động</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {isEditing ? 'Phê duyệt với chỉnh sửa' : 'Phê duyệt'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-red-600 hover:bg-red-50"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={actionLoading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Từ chối
                </Button>
              </CardContent>
            </Card>
          )}

          {suggestion.status === 'approved' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Thực hiện</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={handleExecute}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Tạo Purchase Order
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Risk Analysis */}
          {suggestion.riskAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Phân tích rủi ro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  className={
                    suggestion.riskAnalysis.level === 'high'
                      ? 'bg-red-100 text-red-800'
                      : suggestion.riskAnalysis.level === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }
                >
                  {suggestion.riskAnalysis.level === 'high'
                    ? 'Rủi ro cao'
                    : suggestion.riskAnalysis.level === 'medium'
                    ? 'Rủi ro trung bình'
                    : 'Rủi ro thấp'}
                </Badge>
                <div className="mt-4 space-y-3">
                  {suggestion.riskAnalysis.factors.map((factor, index) => (
                    <div
                      key={index}
                      className="p-2 bg-muted/50 rounded-lg text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle
                          className={`h-4 w-4 ${
                            factor.severity === 'high'
                              ? 'text-red-500'
                              : factor.severity === 'medium'
                              ? 'text-yellow-500'
                              : 'text-green-500'
                          }`}
                        />
                        <span className="font-medium">{factor.name}</span>
                      </div>
                      <p className="text-muted-foreground mt-1">{factor.description}</p>
                      {factor.mitigation && (
                        <p className="text-green-600 mt-1 text-xs">
                          Giải pháp: {factor.mitigation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audit Trail */}
          {suggestion.auditTrail && suggestion.auditTrail.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Lịch sử hoạt động
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suggestion.auditTrail.map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 text-sm"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span className="font-medium">{entry.userName}</span>
                        </div>
                        <p className="text-muted-foreground">{entry.action}</p>
                        {entry.notes && (
                          <p className="text-xs text-muted-foreground italic">
                            "{entry.notes}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(entry.timestamp, true)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thông tin thêm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mã đề xuất</span>
                <span className="font-mono">{suggestion.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ngày tạo</span>
                <span>{formatDate(suggestion.createdAt, true)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mức độ</span>
                <Badge variant="outline">{suggestion.urgency}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối đề xuất PO</DialogTitle>
            <DialogDescription>
              Vui lòng cho biết lý do từ chối đề xuất này
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lý do từ chối</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối..."
                className="h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading || !rejectReason.trim()}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
