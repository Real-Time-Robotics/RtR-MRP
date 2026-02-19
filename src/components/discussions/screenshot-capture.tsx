'use client';

import { useState, useCallback } from 'react';
import { Camera, Loader2, X, Check, RotateCcw } from 'lucide-react';
import { clientLogger } from '@/lib/client-logger';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CapturedContext, AttachmentInput } from '@/types/discussions';

interface ScreenshotCaptureProps {
  onCapture: (attachment: AttachmentInput) => void;
  disabled?: boolean;
  className?: string;
}

export function ScreenshotCapture({ onCapture, disabled, className }: ScreenshotCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [context, setContext] = useState<CapturedContext | null>(null);

  const captureScreen = useCallback(async () => {
    setIsCapturing(true);
    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;

      // Get current page context
      const currentContext: CapturedContext = {
        page: document.title,
        url: window.location.pathname,
        timestamp: new Date().toISOString(),
      };

      // Try to extract ID from URL
      const urlParts = window.location.pathname.split('/');
      const entityTypes = ['parts', 'bom', 'work-orders', 'purchase-orders', 'sales-orders', 'suppliers', 'customers', 'inventory'];
      for (let i = 0; i < urlParts.length; i++) {
        if (entityTypes.includes(urlParts[i]) && urlParts[i + 1]) {
          currentContext.id = urlParts[i + 1];
          break;
        }
      }

      // Get the main content element or body
      const targetElement = document.querySelector('main') || document.body;

      // Capture the screenshot
      const canvas = await html2canvas(targetElement as HTMLElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scale: 1, // Reduce scale for smaller file size
        logging: false,
      });

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          },
          'image/png',
          0.9
        );
      });

      // Create preview URL
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setCapturedBlob(blob);
      setContext(currentContext);
      setShowPreview(true);
    } catch (error) {
      clientLogger.error('Screenshot capture failed', error);
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!capturedBlob || !context) return;

    // In a real implementation, you would upload to a file server here
    // For now, we'll use a data URL
    const reader = new FileReader();
    reader.onloadend = () => {
      const attachment: AttachmentInput = {
        type: 'IMAGE',
        filename: `screenshot-${new Date().toISOString().split('T')[0]}.png`,
        fileUrl: reader.result as string,
        fileSize: capturedBlob.size,
        mimeType: 'image/png',
        capturedContext: context,
      };

      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        attachment.width = img.width;
        attachment.height = img.height;
        onCapture(attachment);
        handleClose();
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(capturedBlob);
  }, [capturedBlob, context, onCapture]);

  const handleClose = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setCapturedBlob(null);
    setContext(null);
    setShowPreview(false);
  }, [previewUrl]);

  const handleRetake = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setCapturedBlob(null);
    captureScreen();
  }, [previewUrl, captureScreen]);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={captureScreen}
            disabled={disabled || isCapturing}
            className={cn('h-8 w-8', className)}
            aria-label="Chụp màn hình"
          >
            {isCapturing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Capture Screenshot</TooltipContent>
      </Tooltip>

      <Dialog open={showPreview} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Screenshot Preview</DialogTitle>
            <DialogDescription>
              Review the captured screenshot before attaching it to your message
            </DialogDescription>
          </DialogHeader>

          {previewUrl && (
            <div className="relative overflow-auto max-h-[60vh] rounded-lg border bg-muted/50">
              <img
                src={previewUrl}
                alt="Screenshot preview"
                className="w-full"
              />
            </div>
          )}

          {context && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Captured from:</span>
              <code className="rounded bg-muted px-2 py-0.5 text-xs">
                {context.url}
              </code>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClose}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button variant="outline" onClick={handleRetake}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake
            </Button>
            <Button onClick={handleConfirm}>
              <Check className="mr-2 h-4 w-4" />
              Attach Screenshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
