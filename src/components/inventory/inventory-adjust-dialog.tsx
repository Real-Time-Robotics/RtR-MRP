'use client';

// src/components/inventory/inventory-adjust-dialog.tsx
// Adjust Inventory Dialog component

import React from 'react';
import { Plus, Minus } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/lib/i18n/language-context';
import type { InventoryItem, AdjustData } from './inventory-types';

interface InventoryAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adjustData: AdjustData;
  onAdjustDataChange: (data: AdjustData) => void;
  adjusting: boolean;
  onSubmit: () => void;
  displayInventory: InventoryItem[];
}

export function InventoryAdjustDialog({
  open,
  onOpenChange,
  adjustData,
  onAdjustDataChange,
  adjusting,
  onSubmit,
  displayInventory,
}: InventoryAdjustDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('inv.adjustTitle')}</DialogTitle>
          <DialogDescription>
            {t('inv.adjustDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>{t('inv.selectPart')}</Label>
            <Select
              value={adjustData.inventoryId}
              onValueChange={(value) => {
                const item = displayInventory.find(i => i.id === value);
                if (item) {
                  onAdjustDataChange({
                    ...adjustData,
                    inventoryId: value,
                    partId: item.partId,
                    warehouseId: item.warehouseId || '',
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('inv.selectPartPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {displayInventory.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.partNumber} - {item.name} [{item.warehouseName || 'N/A'}] (SL: {item.quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('inv.adjustType')}</Label>
              <Select
                value={adjustData.adjustmentType}
                onValueChange={(value) =>
                  onAdjustDataChange({ ...adjustData, adjustmentType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADD">
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-green-600" />
                      {t('inv.addStock')}
                    </span>
                  </SelectItem>
                  <SelectItem value="SUBTRACT">
                    <span className="flex items-center gap-2">
                      <Minus className="h-4 w-4 text-red-600" />
                      {t('inv.subtractStock')}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustQty">{t('inv.quantityLabel')}</Label>
              <Input
                id="adjustQty"
                type="number"
                min="1"
                value={adjustData.quantity}
                onChange={(e) =>
                  onAdjustDataChange({ ...adjustData, quantity: e.target.value })
                }
                placeholder="0"
              />
            </div>
          </div>

          {/* Preview of quantity after adjustment */}
          {adjustData.inventoryId && adjustData.quantity && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
              {(() => {
                const selectedItem = displayInventory.find(item => item.id === adjustData.inventoryId);
                if (!selectedItem) return null;
                const currentQty = selectedItem.quantity;
                const adjustQty = parseInt(adjustData.quantity) || 0;
                const newQty = adjustData.adjustmentType === 'ADD'
                  ? currentQty + adjustQty
                  : currentQty - adjustQty;
                const isNegative = newQty < 0;

                return (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{t('inv.adjustResult')}</span>
                    <div className="flex items-center gap-2 font-medium">
                      <span>{currentQty}</span>
                      <span className="text-slate-400">&rarr;</span>
                      <span className={isNegative ? 'text-red-600' : adjustData.adjustmentType === 'ADD' ? 'text-green-600' : 'text-orange-600'}>
                        {newQty}
                      </span>
                      {isNegative && (
                        <span className="text-xs text-red-500">{t('inv.insufficientStock')}</span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">{t('inv.adjustReason')}</Label>
            <Textarea
              id="reason"
              value={adjustData.reason}
              onChange={(e) =>
                onAdjustDataChange({ ...adjustData, reason: e.target.value })
              }
              placeholder={t('inv.adjustReasonPlaceholder')}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={adjusting}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={onSubmit} disabled={adjusting}>
              {adjusting ? t('common.processing') : t('common.confirm')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
