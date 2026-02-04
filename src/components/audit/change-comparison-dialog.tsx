'use client';

import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Minus,
  Plus,
  Equal,
  ArrowRight,
  User,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ChangeComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oldValue: string | null;
  newValue: string | null;
  fieldName?: string;
  timestamp?: string;
  userName?: string;
}

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed' | 'modified';
  key: string;
  oldValue?: unknown;
  newValue?: unknown;
  level: number;
}

function parseValue(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' ? parsed : { value: parsed };
  } catch {
    return { value };
  }
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
  level = 0
): { key: string; value: unknown; level: number }[] {
  const result: { key: string; value: unknown; level: number }[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result.push({ key: fullKey, value: '{...}', level });
      result.push(
        ...flattenObject(value as Record<string, unknown>, fullKey, level + 1)
      );
    } else {
      result.push({ key: fullKey, value, level });
    }
  }

  return result;
}

function computeDiff(
  oldObj: Record<string, unknown> | null,
  newObj: Record<string, unknown> | null
): DiffLine[] {
  const diff: DiffLine[] = [];
  const allKeys = new Set<string>();

  const oldFlat = oldObj ? flattenObject(oldObj) : [];
  const newFlat = newObj ? flattenObject(newObj) : [];

  const oldMap = new Map(oldFlat.map((item) => [item.key, item]));
  const newMap = new Map(newFlat.map((item) => [item.key, item]));

  oldFlat.forEach((item) => allKeys.add(item.key));
  newFlat.forEach((item) => allKeys.add(item.key));

  const sortedKeys = Array.from(allKeys).sort();

  for (const key of sortedKeys) {
    const oldItem = oldMap.get(key);
    const newItem = newMap.get(key);

    if (!oldItem && newItem) {
      diff.push({
        type: 'added',
        key,
        newValue: newItem.value,
        level: newItem.level,
      });
    } else if (oldItem && !newItem) {
      diff.push({
        type: 'removed',
        key,
        oldValue: oldItem.value,
        level: oldItem.level,
      });
    } else if (oldItem && newItem) {
      const oldVal = JSON.stringify(oldItem.value);
      const newVal = JSON.stringify(newItem.value);

      if (oldVal !== newVal) {
        diff.push({
          type: 'modified',
          key,
          oldValue: oldItem.value,
          newValue: newItem.value,
          level: oldItem.level,
        });
      } else {
        diff.push({
          type: 'unchanged',
          key,
          oldValue: oldItem.value,
          newValue: newItem.value,
          level: oldItem.level,
        });
      }
    }
  }

  return diff;
}

function formatDisplayValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function ChangeComparisonDialog({
  open,
  onOpenChange,
  oldValue,
  newValue,
  fieldName,
  timestamp,
  userName,
}: ChangeComparisonDialogProps) {
  const diffLines = useMemo(() => {
    const oldObj = parseValue(oldValue);
    const newObj = parseValue(newValue);
    return computeDiff(oldObj, newObj);
  }, [oldValue, newValue]);

  const stats = useMemo(() => {
    return {
      added: diffLines.filter((d) => d.type === 'added').length,
      removed: diffLines.filter((d) => d.type === 'removed').length,
      modified: diffLines.filter((d) => d.type === 'modified').length,
      unchanged: diffLines.filter((d) => d.type === 'unchanged').length,
    };
  }, [diffLines]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5" />
            So sánh thay đổi
            {fieldName && (
              <Badge variant="outline" className="ml-2">
                {fieldName}
              </Badge>
            )}
          </DialogTitle>
          {(userName || timestamp) && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {userName && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {userName}
                </span>
              )}
              {timestamp && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                </span>
              )}
            </div>
          )}
        </DialogHeader>

        {/* Stats */}
        <div className="flex items-center gap-3 px-1">
          {stats.added > 0 && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <Plus className="w-3 h-3 mr-1" />
              {stats.added} thêm
            </Badge>
          )}
          {stats.removed > 0 && (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              <Minus className="w-3 h-3 mr-1" />
              {stats.removed} xóa
            </Badge>
          )}
          {stats.modified > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              <ArrowRight className="w-3 h-3 mr-1" />
              {stats.modified} sửa
            </Badge>
          )}
          {stats.unchanged > 0 && (
            <Badge variant="secondary">
              <Equal className="w-3 h-3 mr-1" />
              {stats.unchanged} giữ nguyên
            </Badge>
          )}
        </div>

        {/* Diff View */}
        <ScrollArea className="flex-1 border rounded-lg">
          <div className="p-4 font-mono text-sm">
            {diffLines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Không có thay đổi
              </div>
            ) : (
              <div className="space-y-1">
                {diffLines.map((line, index) => (
                  <DiffLineView key={index} line={line} />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Raw JSON View Toggle */}
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Xem JSON gốc
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium mb-1 text-muted-foreground">Giá trị cũ:</p>
              <pre className="p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                {oldValue ? formatJson(oldValue) : '(trống)'}
              </pre>
            </div>
            <div>
              <p className="text-xs font-medium mb-1 text-muted-foreground">Giá trị mới:</p>
              <pre className="p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                {newValue ? formatJson(newValue) : '(trống)'}
              </pre>
            </div>
          </div>
        </details>
      </DialogContent>
    </Dialog>
  );
}

function DiffLineView({ line }: { line: DiffLine }) {
  const indent = '  '.repeat(line.level);
  const keyName = line.key.split('.').pop() || line.key;

  return (
    <div
      className={cn(
        'flex items-start gap-2 px-2 py-1 rounded',
        line.type === 'added' && 'bg-green-50 dark:bg-green-950/50',
        line.type === 'removed' && 'bg-red-50 dark:bg-red-950/50',
        line.type === 'modified' && 'bg-yellow-50 dark:bg-yellow-950/50'
      )}
    >
      {/* Icon */}
      <span className="flex-shrink-0 w-4 mt-0.5">
        {line.type === 'added' && <Plus className="w-4 h-4 text-green-600" />}
        {line.type === 'removed' && <Minus className="w-4 h-4 text-red-600" />}
        {line.type === 'modified' && <ArrowRight className="w-4 h-4 text-yellow-600" />}
        {line.type === 'unchanged' && <span className="w-4 h-4" />}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className="text-muted-foreground">{indent}</span>
        <span className="font-medium">{keyName}</span>
        <span className="text-muted-foreground">: </span>

        {line.type === 'modified' ? (
          <span>
            <span className="text-red-600 line-through">
              {formatDisplayValue(line.oldValue)}
            </span>
            <span className="mx-2 text-muted-foreground">→</span>
            <span className="text-green-600">{formatDisplayValue(line.newValue)}</span>
          </span>
        ) : line.type === 'added' ? (
          <span className="text-green-600">{formatDisplayValue(line.newValue)}</span>
        ) : line.type === 'removed' ? (
          <span className="text-red-600">{formatDisplayValue(line.oldValue)}</span>
        ) : (
          <span className="text-muted-foreground">
            {formatDisplayValue(line.oldValue)}
          </span>
        )}
      </div>
    </div>
  );
}

function formatJson(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

export default ChangeComparisonDialog;
