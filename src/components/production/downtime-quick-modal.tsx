'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface DowntimeQuickModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workCenterId: string;
  workOrderId?: string;
  equipmentList?: Array<{ id: string; code: string; name: string }>;
  onSubmitted?: () => void;
}

const DOWNTIME_REASONS = [
  { value: 'material', type: 'UNPLANNED' as const, category: 'Material', label: 'Thiếu vật tư' },
  { value: 'breakdown', type: 'BREAKDOWN' as const, category: 'Equipment', label: 'Máy hỏng' },
  { value: 'quality', type: 'UNPLANNED' as const, category: 'Quality', label: 'Chờ kiểm' },
  { value: 'changeover', type: 'CHANGEOVER' as const, category: 'Equipment', label: 'Changeover' },
];

export function DowntimeQuickModal({
  open,
  onOpenChange,
  workCenterId,
  workOrderId,
  equipmentList,
  onSubmitted,
}: DowntimeQuickModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setSubmitting(true);

    const reason = DOWNTIME_REASONS.find((r) => r.value === selectedReason)!;

    try {
      const res = await fetch('/api/production/downtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workCenterId,
          type: reason.type,
          reason: description || reason.label,
          category: reason.category,
          workOrderId: workOrderId || undefined,
          equipmentId: equipmentId || undefined,
        }),
      });

      if (res.ok) {
        setSelectedReason('');
        setDescription('');
        setEquipmentId('');
        onOpenChange(false);
        onSubmitted?.();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Báo sự cố máy</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
            {DOWNTIME_REASONS.map((r) => (
              <div key={r.value} className="flex items-center space-x-3 py-2">
                <RadioGroupItem value={r.value} id={r.value} />
                <Label htmlFor={r.value} className="text-base cursor-pointer">
                  {r.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <Textarea
            placeholder="Mô tả ngắn (không bắt buộc)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />

          {equipmentList && equipmentList.length > 0 && (
            <select
              className="w-full border rounded-md p-2 text-sm"
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              aria-label="Chọn thiết bị"
            >
              <option value="">-- Chọn thiết bị (không bắt buộc) --</option>
              {equipmentList.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.code} — {eq.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedReason || submitting}
            className="bg-red-600 hover:bg-red-700"
          >
            {submitting ? 'Đang gửi...' : 'Gửi báo cáo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
