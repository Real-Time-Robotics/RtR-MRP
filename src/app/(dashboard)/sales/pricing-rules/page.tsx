'use client';

import { useState, useEffect } from 'react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PricingRuleForm } from '@/components/sales/pricing-rule-form';
import { formatCurrency } from '@/lib/utils';

const typeLabels: Record<string, string> = {
  customer_specific: 'Khách hàng',
  quantity_break: 'Theo SL',
  date_based: 'Theo ngày',
  category_discount: 'Danh mục',
};

export default function PricingRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/pricing-rules');
      const data = await res.json();
      if (data.data) {
        setRules(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa quy tắc này?')) return;

    try {
      const res = await fetch(`/api/pricing-rules/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã xóa quy tắc');
        fetchRules();
      } else {
        toast.error(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleFormSuccess = () => {
    setDialogOpen(false);
    setEditingRule(null);
    fetchRules();
  };

  const openCreate = () => {
    setEditingRule(null);
    setDialogOpen(true);
  };

  const openEdit = (rule: any) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quy tắc giá</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm quy tắc
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Sửa quy tắc giá' : 'Thêm quy tắc giá'}
              </DialogTitle>
            </DialogHeader>
            <PricingRuleForm
              rule={editingRule}
              onSuccess={handleFormSuccess}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Áp dụng cho</TableHead>
              <TableHead>Giảm giá</TableHead>
              <TableHead>Ưu tiên</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-24">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Chưa có quy tắc giá nào
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{typeLabels[rule.type] || rule.type}</Badge>
                  </TableCell>
                  <TableCell>{rule.customer?.name || rule.part?.name || 'Tất cả'}</TableCell>
                  <TableCell>
                    {rule.discountType === 'percent'
                      ? `${rule.discountValue}%`
                      : rule.discountType === 'fixed_price'
                        ? `Giá: ${formatCurrency(rule.discountValue)}`
                        : `Giảm ${formatCurrency(rule.discountValue)}`}
                  </TableCell>
                  <TableCell>{rule.priority}</TableCell>
                  <TableCell>
                    <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                      {rule.isActive ? 'Hoạt động' : 'Tắt'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
