'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
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
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface QuoteItem {
  partId: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);

  const [customerId, setCustomerId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<QuoteItem[]>([
    { partId: '', quantity: 1, unitPrice: 0, discountPercent: 0, taxRate: 10 },
  ]);

  useEffect(() => {
    fetch('/api/customers?pageSize=100')
      .then((r) => r.json())
      .then((d) => setCustomers(d.data || []))
      .catch(() => {});

    fetch('/api/parts?pageSize=100')
      .then((r) => r.json())
      .then((d) => setParts(d.data || d.items || []))
      .catch(() => {});
  }, []);

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { partId: '', quantity: 1, unitPrice: 0, discountPercent: 0, taxRate: 10 },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calcLineTotal = (item: QuoteItem) => {
    const discount = 1 - item.discountPercent / 100;
    return Math.round(item.quantity * item.unitPrice * discount * 100) / 100;
  };

  const subtotal = items.reduce((sum, item) => sum + calcLineTotal(item), 0);

  const handlePartChange = (index: number, partId: string) => {
    const part = parts.find((p) => p.id === partId);
    updateItem(index, 'partId', partId);
    if (part?.unitCost) {
      updateItem(index, 'unitPrice', part.unitCost);
    }
  };

  const handleSubmit = async () => {
    if (!customerId) {
      toast.error('Vui lòng chọn khách hàng');
      return;
    }
    if (!validUntil) {
      toast.error('Vui lòng chọn ngày hiệu lực');
      return;
    }
    const validItems = items.filter((item) => item.partId && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Vui lòng thêm ít nhất một sản phẩm');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          validUntil,
          notes: notes || undefined,
          items: validItems.map((item) => ({
            partId: item.partId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            taxRate: item.taxRate,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã tạo báo giá ${data.data.quoteNumber}`);
        router.push(`/sales/quotations/${data.data.id}`);
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
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/sales/quotations')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Tạo báo giá mới</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin chung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Khách hàng *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hiệu lực đến *</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú cho báo giá..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tổng quan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Số sản phẩm:</span>
              <span className="font-medium">{items.filter((i) => i.partId).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tạm tính:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sản phẩm</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm dòng
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Sản phẩm</TableHead>
                <TableHead className="w-24">SL</TableHead>
                <TableHead className="w-32">Đơn giá</TableHead>
                <TableHead className="w-24">Giảm %</TableHead>
                <TableHead className="w-24">Thuế %</TableHead>
                <TableHead className="text-right">Thành tiền</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Select
                      value={item.partId}
                      onValueChange={(v) => handlePartChange(index, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn sản phẩm" />
                      </SelectTrigger>
                      <SelectContent>
                        {parts.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.partNumber} - {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={item.discountPercent}
                      onChange={(e) =>
                        updateItem(index, 'discountPercent', parseFloat(e.target.value) || 0)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={item.taxRate}
                      onChange={(e) =>
                        updateItem(index, 'taxRate', parseFloat(e.target.value) || 0)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(calcLineTotal(item))}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={items.length <= 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/sales/quotations')}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Đang tạo...' : 'Tạo báo giá'}
        </Button>
      </div>
    </div>
  );
}
