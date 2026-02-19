'use client';

// src/components/import/saved-mappings.tsx
// Saved Mappings Component - Manage saved column mapping templates

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { clientLogger } from '@/lib/client-logger';
import {
  Columns,
  Trash2,
  Loader2,
  AlertCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SavedMapping {
  id: string;
  name: string;
  targetType: string;
  mapping: Record<string, string>;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

interface SavedMappingsProps {
  onSelectMapping?: (mapping: SavedMapping) => void;
  targetType?: string;
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  PARTS: 'Linh kiện',
  SUPPLIERS: 'Nhà cung cấp',
  INVENTORY: 'Tồn kho',
  BOM: 'BOM',
  PRODUCTS: 'Sản phẩm',
  CUSTOMERS: 'Khách hàng',
  PURCHASE_ORDERS: 'Đơn mua hàng',
};

export function SavedMappings({ onSelectMapping, targetType }: SavedMappingsProps) {
  const [mappings, setMappings] = useState<SavedMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch saved mappings
  useEffect(() => {
    const fetchMappings = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (targetType) {
          params.append('targetType', targetType);
        }

        const res = await fetch(`/api/import/mappings?${params}`);
        const data = await res.json();

        if (data.success) {
          setMappings(data.data);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError('Không thể tải danh sách mapping');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMappings();
  }, [targetType]);

  // Handle delete
  const handleDelete = async (mappingId: string) => {
    setDeletingId(mappingId);
    try {
      const res = await fetch(`/api/import/mappings?id=${mappingId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setMappings((prev) => prev.filter((m) => m.id !== mappingId));
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Không thể xóa mapping');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle use mapping
  const handleUseMapping = async (mapping: SavedMapping) => {
    try {
      await fetch('/api/import/mappings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappingId: mapping.id }),
      });

      onSelectMapping?.(mapping);
    } catch (err) {
      clientLogger.error('Failed to update mapping usage', err);
      onSelectMapping?.(mapping);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        <AlertCircle className="w-4 h-4" />
        <span>{error}</span>
      </div>
    );
  }

  if (mappings.length === 0) {
    return (
      <div className="text-center py-8">
        <Columns className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          Chưa có mapping nào được lưu
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Lưu mapping để tái sử dụng cho các file có định dạng tương tự
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mappings.map((mapping) => {
        const fieldCount = Object.keys(mapping.mapping).length;

        return (
          <div
            key={mapping.id}
            className="flex items-center gap-4 p-4 bg-white border rounded-lg hover:border-blue-300 transition-colors"
          >
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Columns className="w-5 h-5 text-purple-600" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium truncate">{mapping.name}</h4>
                <Badge variant="outline" className="text-xs">
                  {ENTITY_TYPE_LABELS[mapping.targetType] || mapping.targetType}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span>{fieldCount} cột</span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {mapping.usageCount} lượt dùng
                </span>
                {mapping.lastUsedAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(mapping.lastUsedAt), 'dd/MM/yyyy', { locale: vi })}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => handleUseMapping(mapping)}
              >
                Sử dụng
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-red-600"
                    disabled={deletingId === mapping.id}
                    aria-label="Xóa"
                  >
                    {deletingId === mapping.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xóa mapping?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bạn có chắc muốn xóa mapping "{mapping.name}"? Hành động này không thể hoàn tác.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(mapping.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Xóa
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        );
      })}
    </div>
  );
}
