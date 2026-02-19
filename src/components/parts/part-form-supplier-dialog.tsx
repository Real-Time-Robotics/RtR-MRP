'use client';

import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PartFormData, COUNTRIES } from './part-form-schema';
import type { SupplierRecord } from './part-form-types';

// ---------- Create Supplier Dialog ----------

export interface CreateSupplierDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    form: UseFormReturn<PartFormData>;
    onSupplierCreated: (supplier: SupplierRecord) => void;
}

export function CreateSupplierDialog({
    open,
    onOpenChange,
    form,
    onSupplierCreated,
}: CreateSupplierDialogProps): React.ReactElement {
    const [creatingSup, setCreatingSup] = useState(false);
    const [newSupCode, setNewSupCode] = useState('');
    const [newSupName, setNewSupName] = useState('');
    const [newSupCountry, setNewSupCountry] = useState('Việt Nam');
    const [newSupContact, setNewSupContact] = useState('');
    const [newSupEmail, setNewSupEmail] = useState('');
    const [newSupPhone, setNewSupPhone] = useState('');

    const resetFields = () => {
        setNewSupCode('');
        setNewSupName('');
        setNewSupCountry('Việt Nam');
        setNewSupContact('');
        setNewSupEmail('');
        setNewSupPhone('');
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen) {
            resetFields();
        }
        onOpenChange(isOpen);
    };

    const handleCreateSupplier = async () => {
        if (!newSupCode.trim()) { toast.error('Mã nhà cung cấp là bắt buộc'); return; }
        if (!newSupName.trim()) { toast.error('Tên nhà cung cấp là bắt buộc'); return; }

        setCreatingSup(true);
        try {
            const res = await fetch('/api/suppliers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: newSupCode.trim(),
                    name: newSupName.trim(),
                    country: newSupCountry || 'Việt Nam',
                    contactName: newSupContact.trim() || null,
                    contactEmail: newSupEmail.trim() || null,
                    contactPhone: newSupPhone.trim() || null,
                }),
            });

            if (res.ok) {
                const result = await res.json();
                const newSup = result.data || result;
                toast.success(`Đã tạo nhà cung cấp "${newSup.name}"`);
                onSupplierCreated({ id: newSup.id, name: newSup.name, code: newSup.code });
                form.setValue('primarySupplierId', newSup.id);
                onOpenChange(false);
            } else {
                const err = await res.json();
                toast.error(err.error || err.message || 'Lỗi tạo nhà cung cấp');
            }
        } catch {
            toast.error('Lỗi kết nối');
        } finally {
            setCreatingSup(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Tạo nhà cung cấp mới</DialogTitle>
                    <DialogDescription>
                        Nhập thông tin nhà cung cấp. Sau khi tạo sẽ tự động chọn cho part này.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Mã NCC *</Label>
                            <Input
                                value={newSupCode}
                                onChange={(e) => setNewSupCode(e.target.value)}
                                placeholder="e.g., SUP-001"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Tên nhà cung cấp *</Label>
                            <Input
                                value={newSupName}
                                onChange={(e) => setNewSupName(e.target.value)}
                                placeholder="e.g., Công ty ABC"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Quốc gia *</Label>
                        <Select value={newSupCountry} onValueChange={setNewSupCountry}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {COUNTRIES.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                            <Label>Người liên hệ</Label>
                            <Input
                                value={newSupContact}
                                onChange={(e) => setNewSupContact(e.target.value)}
                                placeholder="Tên"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={newSupEmail}
                                onChange={(e) => setNewSupEmail(e.target.value)}
                                placeholder="email@..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>SĐT</Label>
                            <Input
                                value={newSupPhone}
                                onChange={(e) => setNewSupPhone(e.target.value)}
                                placeholder="0..."
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={creatingSup}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            onClick={handleCreateSupplier}
                            disabled={creatingSup || !newSupCode.trim() || !newSupName.trim()}
                        >
                            {creatingSup ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Đang tạo...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Tạo NCC
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ---------- Supplier Picker Dialog ----------

export interface SupplierPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    matchingSuppliers: SupplierRecord[];
    manufacturerName: string;
    form: UseFormReturn<PartFormData>;
    onClose: () => void;
}

export function SupplierPickerDialog({
    open,
    onOpenChange,
    matchingSuppliers,
    manufacturerName,
    form,
    onClose,
}: SupplierPickerDialogProps): React.ReactElement {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Chọn nhà cung cấp</DialogTitle>
                    <DialogDescription>
                        Có {matchingSuppliers.length} NCC trùng tên &quot;{manufacturerName}&quot;. Vui lòng chọn đúng NCC.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 pt-2">
                    {matchingSuppliers.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-accent hover:border-primary transition-colors text-left"
                            onClick={() => {
                                form.setValue('primarySupplierId', s.id);
                                toast.success(`Đã chọn NCC "${s.code} - ${s.name}"`);
                                onClose();
                            }}
                        >
                            <div>
                                <p className="font-medium">{s.name}</p>
                                <p className="text-sm text-muted-foreground">{s.code}</p>
                            </div>
                            <Badge variant="outline">{s.code}</Badge>
                        </button>
                    ))}
                </div>
                <div className="flex justify-end pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                    >
                        Hủy
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
