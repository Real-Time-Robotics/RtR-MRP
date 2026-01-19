'use client';

// =============================================================================
// BULK APPROVAL MODAL - Confirmation dialog for bulk approve/reject
// Shows summary of selected items and total value
// =============================================================================

import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Check,
  X,
  AlertTriangle,
  Package,
  Building2,
  Loader2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { POSuggestion } from './suggestion-card';
import { useState } from 'react';

interface BulkApprovalModalProps {
  open: boolean;
  onClose: () => void;
  suggestions: POSuggestion[];
  action: 'approve' | 'reject';
  onConfirm: (notes: string) => void;
  loading?: boolean;
}

export function BulkApprovalModal({
  open,
  onClose,
  suggestions,
  action,
  onConfirm,
  loading = false,
}: BulkApprovalModalProps) {
  const [notes, setNotes] = useState('');

  const isApprove = action === 'approve';
  const totalValue = suggestions.reduce((sum, s) => sum + s.totalAmount, 0);
  const highRiskCount = suggestions.filter(
    (s) => s.urgency === 'critical' || s.confidence < 0.6
  ).length;

  const handleConfirm = () => {
    onConfirm(notes);
    setNotes('');
  };

  const handleClose = () => {
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApprove ? (
              <>
                <Check className="h-5 w-5 text-green-600" />
                Xác nhận phê duyệt hàng loạt
              </>
            ) : (
              <>
                <X className="h-5 w-5 text-red-600" />
                Xác nhận từ chối hàng loạt
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? `Bạn sắp phê duyệt ${suggestions.length} đề xuất PO với tổng giá trị ${formatCurrency(totalValue)}.`
              : `Bạn sắp từ chối ${suggestions.length} đề xuất PO.`}
          </DialogDescription>
        </DialogHeader>

        {/* Warning for high risk items */}
        {highRiskCount > 0 && isApprove && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Lưu ý: {highRiskCount} mục có độ tin cậy thấp hoặc khẩn cấp
              </p>
              <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                Vui lòng kiểm tra kỹ trước khi phê duyệt
              </p>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold">{suggestions.length}</p>
            <p className="text-xs text-muted-foreground">Số lượng</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(totalValue, true)}
            </p>
            <p className="text-xs text-muted-foreground">Tổng giá trị</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {new Set(suggestions.map((s) => s.supplierId)).size}
            </p>
            <p className="text-xs text-muted-foreground">Nhà cung cấp</p>
          </div>
        </div>

        {/* Items list */}
        <div className="space-y-2">
          <Label>Danh sách đề xuất</Label>
          <ScrollArea className="h-[150px] border rounded-md p-2">
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded"
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{suggestion.partNumber}</span>
                    <Badge variant="outline" className="text-xs">
                      {suggestion.urgency}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs">
                      {suggestion.supplierName}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(suggestion.totalAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">
            {isApprove ? 'Ghi chú phê duyệt (tùy chọn)' : 'Lý do từ chối'}
          </Label>
          <Textarea
            id="notes"
            placeholder={
              isApprove
                ? 'Nhập ghi chú nếu cần...'
                : 'Vui lòng nhập lý do từ chối...'
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-20"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || (!isApprove && !notes.trim())}
            className={cn(
              isApprove
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            )}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isApprove ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Phê duyệt {suggestions.length} mục
              </>
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                Từ chối {suggestions.length} mục
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BulkApprovalModal;
