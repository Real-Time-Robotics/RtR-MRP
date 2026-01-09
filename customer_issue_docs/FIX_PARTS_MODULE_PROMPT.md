# 🔧 MASTER PROMPT - FIX PARTS MODULE
## Dành cho Claude Code - Priority: CRITICAL
## Date: 2026-01-09

---

## 🎯 MISSION

Fix Parts module để đáp ứng 3 yêu cầu khách hàng:
1. ✅ Mở được cửa sổ nhập dữ liệu
2. ✅ Lưu được dữ liệu thành công
3. ✅ Export dữ liệu để verify

---

## 📋 CURRENT ISSUES

### Issue 1: Add Part button không hoạt động

**File:** `components/pages/parts-master.tsx` (Line 600-604)

**Vấn đề:** Button không có onClick handler

```tsx
// HIỆN TẠI:
<button className="px-4 py-2 text-sm font-medium text-white bg-primary-600...">
  <Plus className="h-4 w-4" />
  Add Part
</button>
```

### Issue 2: Không có Form Dialog component

**Missing:** `components/parts/part-form-dialog.tsx`

### Issue 3: Đang dùng Mock Data

**File:** `components/pages/parts-master.tsx` (Line 44-150)

```tsx
// HIỆN TẠI - MOCK:
const partsData = [ ... mock data ... ];

// CẦN: API call
const { data, mutate } = useSWR('/api/v2/parts');
```

---

## 🔧 STEP-BY-STEP FIX

### STEP 1: Tạo Part Form Dialog

**File mới:** `components/parts/part-form-dialog.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const partFormSchema = z.object({
  partNumber: z.string().min(1, 'Mã part là bắt buộc').max(50),
  name: z.string().min(1, 'Tên part là bắt buộc').max(200),
  description: z.string().max(1000).optional(),
  category: z.string().min(1, 'Danh mục là bắt buộc'),
  unit: z.string().default('EA'),
  unitCost: z.coerce.number().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(0),
  maxStock: z.coerce.number().int().min(0).optional(),
  reorderPoint: z.coerce.number().int().min(0).default(0),
  leadTimeDays: z.coerce.number().int().min(0).default(14),
});

type PartFormData = z.infer<typeof partFormSchema>;

// =============================================================================
// COMPONENT
// =============================================================================

interface PartFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part?: any | null; // null = create, có data = edit
  onSuccess?: () => void;
}

const CATEGORIES = [
  { value: 'FINISHED_GOOD', label: 'Thành phẩm' },
  { value: 'SEMI_FINISHED', label: 'Bán thành phẩm' },
  { value: 'COMPONENT', label: 'Linh kiện' },
  { value: 'RAW_MATERIAL', label: 'Nguyên liệu' },
  { value: 'CONSUMABLE', label: 'Vật tư tiêu hao' },
  { value: 'PACKAGING', label: 'Bao bì' },
];

const UNITS = [
  { value: 'EA', label: 'Cái (EA)' },
  { value: 'PCS', label: 'Chiếc (PCS)' },
  { value: 'KG', label: 'Kilogram (KG)' },
  { value: 'M', label: 'Mét (M)' },
  { value: 'L', label: 'Lít (L)' },
  { value: 'SET', label: 'Bộ (SET)' },
];

export function PartFormDialog({ 
  open, 
  onOpenChange, 
  part, 
  onSuccess 
}: PartFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = !!part?.id;

  const form = useForm<PartFormData>({
    resolver: zodResolver(partFormSchema),
    defaultValues: {
      partNumber: '',
      name: '',
      description: '',
      category: 'COMPONENT',
      unit: 'EA',
      unitCost: 0,
      minStock: 0,
      maxStock: undefined,
      reorderPoint: 0,
      leadTimeDays: 14,
    },
  });

  // Reset form when part changes
  useEffect(() => {
    if (part) {
      form.reset({
        partNumber: part.partNumber || '',
        name: part.name || '',
        description: part.description || '',
        category: part.category || 'COMPONENT',
        unit: part.unit || 'EA',
        unitCost: part.unitCost || 0,
        minStock: part.minStock || 0,
        maxStock: part.maxStock || undefined,
        reorderPoint: part.reorderPoint || 0,
        leadTimeDays: part.leadTimeDays || 14,
      });
    } else {
      form.reset({
        partNumber: '',
        name: '',
        description: '',
        category: 'COMPONENT',
        unit: 'EA',
        unitCost: 0,
        minStock: 0,
        maxStock: undefined,
        reorderPoint: 0,
        leadTimeDays: 14,
      });
    }
  }, [part, form]);

  const onSubmit = async (data: PartFormData) => {
    setIsLoading(true);
    try {
      const url = isEdit ? `/api/v2/parts/${part.id}` : '/api/v2/parts';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Có lỗi xảy ra');
      }

      toast.success(isEdit ? 'Cập nhật part thành công!' : 'Tạo part mới thành công!');
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Chỉnh sửa Part' : 'Tạo Part mới'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Row 1: Part Number & Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="partNumber">Mã Part <span className="text-red-500">*</span></Label>
              <Input 
                id="partNumber"
                {...form.register('partNumber')}
                placeholder="VD: PRT-001"
                disabled={isEdit}
              />
              {form.formState.errors.partNumber && (
                <p className="text-red-500 text-sm">
                  {form.formState.errors.partNumber.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Tên Part <span className="text-red-500">*</span></Label>
              <Input 
                id="name"
                {...form.register('name')}
                placeholder="Tên part"
              />
              {form.formState.errors.name && (
                <p className="text-red-500 text-sm">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Category & Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Danh mục <span className="text-red-500">*</span></Label>
              <Select
                value={form.watch('category')}
                onValueChange={(value) => form.setValue('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Đơn vị tính</Label>
              <Select
                value={form.watch('unit')}
                onValueChange={(value) => form.setValue('unit', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn đơn vị" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Cost & Lead Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unitCost">Đơn giá (VND)</Label>
              <Input 
                id="unitCost"
                type="number"
                step="0.01"
                {...form.register('unitCost')}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leadTimeDays">Lead Time (ngày)</Label>
              <Input 
                id="leadTimeDays"
                type="number"
                {...form.register('leadTimeDays')}
                placeholder="14"
              />
            </div>
          </div>

          {/* Row 4: Stock Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minStock">Tồn kho tối thiểu</Label>
              <Input 
                id="minStock"
                type="number"
                {...form.register('minStock')}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxStock">Tồn kho tối đa</Label>
              <Input 
                id="maxStock"
                type="number"
                {...form.register('maxStock')}
                placeholder="Không giới hạn"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorderPoint">Điểm đặt hàng lại</Label>
              <Input 
                id="reorderPoint"
                type="number"
                {...form.register('reorderPoint')}
                placeholder="0"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea 
              id="description"
              {...form.register('description')}
              placeholder="Mô tả chi tiết về part..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### STEP 2: Tạo thư mục components/parts

```bash
mkdir -p components/parts
```

### STEP 3: Update Parts Master Page

**File:** `components/pages/parts-master.tsx`

**Thay đổi cần thực hiện:**

```tsx
// 1. Thêm imports ở đầu file
import { PartFormDialog } from '@/components/parts/part-form-dialog';
import useSWR from 'swr';
import { toast } from 'sonner';

// 2. Thêm fetcher function
const fetcher = (url: string) => fetch(url).then(res => res.json());

// 3. Trong component, thay mock data bằng:
export default function PartsMasterPage() {
  // Fetch real data
  const { data: partsResponse, isLoading, mutate } = useSWR('/api/v2/parts', fetcher);
  const partsData = partsResponse?.data || [];

  // Form dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);

  // ... rest of existing state

// 4. Update Add Part button (around line 600):
<button 
  onClick={() => setShowCreateDialog(true)}
  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2"
>
  <Plus className="h-4 w-4" />
  Add Part
</button>

// 5. Update Export button:
<button 
  onClick={handleExport}
  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
>
  <Download className="h-4 w-4" />
  Export
</button>

// 6. Add export handler:
const handleExport = async () => {
  try {
    const response = await fetch('/api/export?type=parts&format=xlsx');
    if (!response.ok) throw new Error('Export failed');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parts-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast.success('Export thành công!');
  } catch (error) {
    toast.error('Export thất bại');
  }
};

// 7. Update Edit button trong table row (around line 819):
onClick={() => {
  e.stopPropagation();
  setEditingPart(part);
}}

// 8. Add dialogs at the end of the component (before closing div):
{/* Create Dialog */}
<PartFormDialog
  open={showCreateDialog}
  onOpenChange={setShowCreateDialog}
  onSuccess={() => mutate()}
/>

{/* Edit Dialog */}
<PartFormDialog
  open={!!editingPart}
  onOpenChange={(open) => !open && setEditingPart(null)}
  part={editingPart}
  onSuccess={() => {
    mutate();
    setEditingPart(null);
  }}
/>
```

### STEP 4: Verify API Endpoints

Check these endpoints work correctly:

```bash
# List parts
curl http://localhost:3000/api/v2/parts

# Create part
curl -X POST http://localhost:3000/api/v2/parts \
  -H "Content-Type: application/json" \
  -d '{"partNumber":"TEST-001","name":"Test Part","category":"COMPONENT"}'

# Update part
curl -X PUT http://localhost:3000/api/v2/parts/[id] \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'

# Export
curl http://localhost:3000/api/export?type=parts
```

### STEP 5: Add Loading State

```tsx
// In PartsMasterPage, add loading handling:
if (isLoading) {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      <span className="ml-2">Đang tải dữ liệu...</span>
    </div>
  );
}
```

---

## ✅ VERIFICATION CHECKLIST

Sau khi fix, test các bước sau:

1. **Mở form:**
   - [ ] Click "Add Part" → Dialog mở
   - [ ] Click "Edit" trên row → Dialog mở với data

2. **Nhập liệu:**
   - [ ] Form validation hiển thị lỗi khi để trống required fields
   - [ ] Có thể nhập đầy đủ thông tin

3. **Lưu:**
   - [ ] Click "Tạo mới" → Data lưu vào database
   - [ ] Click "Cập nhật" → Data update
   - [ ] Toast notification hiển thị

4. **Verify:**
   - [ ] Refresh page → Data vẫn còn
   - [ ] Click Export → File download
   - [ ] Mở file → Data đúng

---

## 📞 BÁO CÁO

Sau khi hoàn thành, báo cáo:
1. Screenshot form dialog
2. Screenshot success toast
3. Screenshot exported file
4. Link để customer test

---

*Master Prompt - Fix Parts Module*
*Priority: CRITICAL*
*Deadline: ASAP*
