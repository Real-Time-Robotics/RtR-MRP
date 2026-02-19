'use client';

// src/components/saved-views/saved-views-dropdown.tsx
// Dropdown for selecting and managing saved views

import { useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  Plus,
  Star,
  Trash2,
  Copy,
  Edit,
  Share2,
  Loader2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { SavedView } from '@/hooks/use-saved-views';

interface SavedViewsDropdownProps {
  views: SavedView[];
  currentView: SavedView | null;
  loading?: boolean;
  onSelectView: (view: SavedView) => void;
  onSaveView: (name: string, isShared: boolean) => Promise<void>;
  onUpdateView?: (id: string, updates: Partial<SavedView>) => Promise<void>;
  onDeleteView: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  className?: string;
}

export function SavedViewsDropdown({
  views,
  currentView,
  loading,
  onSelectView,
  onSaveView,
  onUpdateView,
  onDeleteView,
  onSetDefault,
  className,
}: SavedViewsDropdownProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!newViewName.trim()) return;
    setIsSaving(true);
    try {
      await onSaveView(newViewName.trim(), isShared);
      setSaveDialogOpen(false);
      setNewViewName('');
      setIsShared(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={cn('min-w-[160px]', className)}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bookmark className="h-4 w-4 mr-2" />
            )}
            <span className="truncate max-w-[120px]">
              {currentView?.name || 'Saved Views'}
            </span>
            <ChevronDown className="h-4 w-4 ml-auto" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {/* Save new view */}
          <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Lưu view hiện tại
          </DropdownMenuItem>

          {views.length > 0 && <DropdownMenuSeparator />}

          {/* View list */}
          {views.map((view) => (
            <DropdownMenuItem
              key={view.id}
              className="group flex items-center justify-between"
              onClick={() => onSelectView(view)}
            >
              <div className="flex items-center gap-2 min-w-0">
                {view.isDefault && (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                )}
                {view.isShared && !view.isDefault && (
                  <Share2 className="h-3 w-3 text-blue-500 flex-shrink-0" />
                )}
                <span className="truncate">{view.name}</span>
                {currentView?.id === view.id && (
                  <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!view.isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetDefault(view.id);
                    }}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                    title="Đặt mặc định"
                  >
                    <Star className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Xóa view này?')) {
                      onDeleteView(view.id);
                    }
                  }}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                  title="Xóa"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </DropdownMenuItem>
          ))}

          {views.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              Chưa có view nào được lưu
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Lưu View</DialogTitle>
            <DialogDescription>
              Lưu bộ lọc và cài đặt hiện tại để sử dụng sau
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tên view</Label>
              <Input
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="VD: Hàng tồn kho thấp"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Chia sẻ với team</Label>
                <p className="text-xs text-muted-foreground">
                  Người khác cũng có thể sử dụng view này
                </p>
              </div>
              <Switch checked={isShared} onCheckedChange={setIsShared} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={!newViewName.trim() || isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
