'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui-v2/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface AuditFormProps {
  supplierId: string;
  audit?: {
    id: string;
    auditDate: string;
    auditType: string;
    score: number | null;
    findings: string | null;
    recommendations: string | null;
    nextAuditDate: string | null;
    status: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function AuditForm({ supplierId, audit, onSuccess, onCancel }: AuditFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    auditDate: audit?.auditDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    auditType: audit?.auditType || 'quality',
    score: audit?.score?.toString() || '',
    findings: audit?.findings || '',
    recommendations: audit?.recommendations || '',
    nextAuditDate: audit?.nextAuditDate?.slice(0, 10) || '',
    status: audit?.status || 'completed',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        auditDate: new Date(formData.auditDate).toISOString(),
        auditType: formData.auditType,
        score: formData.score ? Number(formData.score) : undefined,
        findings: formData.findings || undefined,
        recommendations: formData.recommendations || undefined,
        nextAuditDate: formData.nextAuditDate
          ? new Date(formData.nextAuditDate).toISOString()
          : undefined,
        status: formData.status,
      };

      const url = audit
        ? `/api/suppliers/${supplierId}/audits/${audit.id}`
        : `/api/suppliers/${supplierId}/audits`;
      const method = audit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        onSuccess();
      } else {
        toast.error(data.error || 'Có lỗi xảy ra');
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Ngày audit *</Label>
          <Input
            type="date"
            value={formData.auditDate}
            onChange={(e) => setFormData({ ...formData, auditDate: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Loại audit *</Label>
          <Select
            value={formData.auditType}
            onValueChange={(v) => setFormData({ ...formData, auditType: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quality">Chất lượng</SelectItem>
              <SelectItem value="compliance">Tuân thủ</SelectItem>
              <SelectItem value="financial">Tài chính</SelectItem>
              <SelectItem value="site_visit">Thăm nhà máy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Điểm (0-100)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={formData.score}
            onChange={(e) => setFormData({ ...formData, score: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Trạng thái</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData({ ...formData, status: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Đã lên lịch</SelectItem>
              <SelectItem value="in_progress">Đang thực hiện</SelectItem>
              <SelectItem value="completed">Hoàn thành</SelectItem>
              <SelectItem value="cancelled">Đã hủy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Phát hiện</Label>
        <Textarea
          value={formData.findings}
          onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Khuyến nghị</Label>
        <Textarea
          value={formData.recommendations}
          onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Ngày audit tiếp theo</Label>
        <Input
          type="date"
          value={formData.nextAuditDate}
          onChange={(e) => setFormData({ ...formData, nextAuditDate: e.target.value })}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Đang lưu...' : (audit ? 'Cập nhật' : 'Tạo mới')}
        </Button>
      </div>
    </form>
  );
}
