'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface PricingRuleFormProps {
  rule?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PricingRuleForm({ rule, onSuccess, onCancel }: PricingRuleFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    description: rule?.description || '',
    type: rule?.type || 'customer_specific',
    customerId: rule?.customerId || '',
    partId: rule?.partId || '',
    category: rule?.category || '',
    minQuantity: rule?.minQuantity?.toString() || '',
    maxQuantity: rule?.maxQuantity?.toString() || '',
    validFrom: rule?.validFrom?.slice(0, 10) || '',
    validTo: rule?.validTo?.slice(0, 10) || '',
    discountType: rule?.discountType || 'percent',
    discountValue: rule?.discountValue?.toString() || '',
    priority: rule?.priority?.toString() || '0',
    isActive: rule?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        priority: Number(formData.priority),
        isActive: formData.isActive,
      };

      if (formData.customerId) payload.customerId = formData.customerId;
      if (formData.partId) payload.partId = formData.partId;
      if (formData.category) payload.category = formData.category;
      if (formData.minQuantity) payload.minQuantity = Number(formData.minQuantity);
      if (formData.maxQuantity) payload.maxQuantity = Number(formData.maxQuantity);
      if (formData.validFrom) payload.validFrom = formData.validFrom;
      if (formData.validTo) payload.validTo = formData.validTo;

      const url = rule ? `/api/pricing-rules/${rule.id}` : '/api/pricing-rules';
      const method = rule ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(rule ? 'Đã cập nhật quy tắc' : 'Đã tạo quy tắc');
        onSuccess();
      } else {
        toast.error(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tên quy tắc *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Loại quy tắc *</Label>
          <Select
            value={formData.type}
            onValueChange={(v) => setFormData({ ...formData, type: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer_specific">Khách hàng cụ thể</SelectItem>
              <SelectItem value="quantity_break">Theo số lượng</SelectItem>
              <SelectItem value="date_based">Theo thời gian</SelectItem>
              <SelectItem value="category_discount">Theo danh mục</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Loại giảm giá *</Label>
          <Select
            value={formData.discountType}
            onValueChange={(v) => setFormData({ ...formData, discountType: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Phần trăm (%)</SelectItem>
              <SelectItem value="fixed_amount">Số tiền cố định</SelectItem>
              <SelectItem value="fixed_price">Giá cố định</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Giá trị *</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            value={formData.discountValue}
            onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
            required
          />
        </div>
      </div>

      {formData.type === 'quantity_break' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Số lượng tối thiểu</Label>
            <Input
              type="number"
              min={1}
              value={formData.minQuantity}
              onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Số lượng tối đa</Label>
            <Input
              type="number"
              min={1}
              value={formData.maxQuantity}
              onChange={(e) => setFormData({ ...formData, maxQuantity: e.target.value })}
            />
          </div>
        </div>
      )}

      {formData.type === 'date_based' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Từ ngày</Label>
            <Input
              type="date"
              value={formData.validFrom}
              onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Đến ngày</Label>
            <Input
              type="date"
              value={formData.validTo}
              onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
            />
          </div>
        </div>
      )}

      {formData.type === 'category_discount' && (
        <div className="space-y-2">
          <Label>Danh mục</Label>
          <Input
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="Nhập tên danh mục..."
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Độ ưu tiên</Label>
          <Input
            type="number"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
          />
        </div>
        <div className="flex items-center space-x-2 pt-6">
          <Switch
            checked={formData.isActive}
            onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
          />
          <Label>Kích hoạt</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Đang lưu...' : rule ? 'Cập nhật' : 'Tạo mới'}
        </Button>
      </div>
    </form>
  );
}
