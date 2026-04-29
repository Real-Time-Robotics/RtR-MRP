'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

interface BomLine {
  partNumber: string;
  name: string;
  unit: string;
  qtyPerUnit: number;
  qtyRequired: number;
  qtyAllocated: number;
  qtyIssued: number;
}

interface BomCollapsibleProps {
  workOrderId: string;
  autoRefreshMs?: number;
}

export function BomCollapsible({ workOrderId, autoRefreshMs = 30000 }: BomCollapsibleProps) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<BomLine[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBom = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/production/shift-entry/wo/${workOrderId}/bom`);
      if (res.ok) {
        const data = await res.json();
        setLines(data.bomLines || []);
      }
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    if (!open) return;
    fetchBom();
    const interval = setInterval(fetchBom, autoRefreshMs);
    return () => clearInterval(interval);
  }, [open, fetchBom, autoRefreshMs]);

  return (
    <div className="mt-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs w-full justify-start text-muted-foreground"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Xem BOM"
      >
        {open ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
        BOM ({lines.length > 0 ? `${lines.length} items` : '...'})
      </Button>

      {open && (
        <div className="mt-1 border rounded-md p-2 bg-slate-50 text-xs space-y-1">
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-[10px]"
              onClick={fetchBom}
              disabled={loading}
              aria-label="Cập nhật BOM"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Cập nhật
            </Button>
          </div>

          {lines.length === 0 ? (
            <p className="text-muted-foreground text-center py-2">
              {loading ? 'Đang tải...' : 'Không có BOM'}
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left font-normal pb-1">Linh kiện</th>
                  <th className="text-right font-normal pb-1">Cần</th>
                  <th className="text-right font-normal pb-1">Xuất</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const fulfilled = line.qtyIssued >= line.qtyRequired;
                  return (
                    <tr key={line.partNumber} className="border-t border-slate-200">
                      <td className="py-1">
                        <span className="font-medium">{line.partNumber}</span>
                        <br />
                        <span className="text-muted-foreground">{line.name}</span>
                      </td>
                      <td className="text-right py-1">{line.qtyRequired}</td>
                      <td className="text-right py-1">
                        <Badge
                          variant={fulfilled ? 'default' : 'destructive'}
                          className="text-[10px]"
                        >
                          {line.qtyIssued}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
