'use client';

/**
 * Change Impact Dialog Component
 * Shows the impact of pending changes before saving
 */

import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChangeImpactDialogProps } from './types';
import { ChangeImpactTable } from './change-impact-table';
import { ImpactedItem } from '@/lib/change-impact/types';

export function ChangeImpactDialog({
  open,
  onOpenChange,
  result,
  loading = false,
  onConfirm,
  onCancel,
}: ChangeImpactDialogProps) {
  const handleNavigate = (item: ImpactedItem) => {
    if (item.navigationUrl) {
      // Open in new tab to preserve form state
      window.open(item.navigationUrl, '_blank');
    }
  };

  const hasImpacts = result && result.impactedItems.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                Analyzing Impact...
              </>
            ) : hasImpacts ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Change Impact Analysis
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                No Impact Detected
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? 'Calculating how your changes will affect related data...'
              : hasImpacts
              ? `Your changes will affect ${result.totalImpactedCount} related item(s). Review the impacts below before confirming.`
              : 'Your changes will not affect any related data. You can safely proceed.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : result ? (
          <>
            {/* Source Info */}
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
              <div>
                <span className="text-sm text-muted-foreground">Source: </span>
                <Badge variant="outline" className="ml-1">
                  {result.sourceEntity.toUpperCase()}
                </Badge>
                <span className="ml-2 font-mono text-sm">{result.sourceCode}</span>
              </div>
              <div className="ml-auto text-sm text-muted-foreground">
                {result.changes.length} field(s) changed
              </div>
            </div>

            {/* Changes Summary */}
            {result.changes.length > 0 && (
              <div className="p-3 border rounded-lg">
                <h4 className="text-sm font-medium mb-2">Your Changes:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {result.changes.map((change, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium">{change.fieldLabel}:</span>{' '}
                      <span className="text-muted-foreground">
                        {String(change.oldValue)}
                      </span>
                      <span className="mx-1">→</span>
                      <span className="text-primary font-medium">
                        {String(change.newValue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Impact Table */}
            {hasImpacts && (
              <div className="border rounded-lg overflow-hidden">
                <div className="p-3 border-b bg-muted/30">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Impacted Items ({result.totalImpactedCount})
                  </h4>
                </div>
                <ScrollArea className="max-h-[300px]">
                  <ChangeImpactTable
                    items={result.impactedItems}
                    onNavigate={handleNavigate}
                  />
                </ScrollArea>
              </div>
            )}
          </>
        ) : null}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            variant={hasImpacts ? 'default' : 'default'}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : hasImpacts ? (
              'Confirm & Save'
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
