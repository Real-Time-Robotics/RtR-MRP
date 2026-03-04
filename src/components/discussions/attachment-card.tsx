'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import {
  Download,
  Eye,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  File,
  Package,
  FileStack,
  ClipboardList,
  ShoppingCart,
  Receipt,
  Truck,
  Users,
  Warehouse,
  CheckCircle,
  Calculator,
  Pencil,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  MessageAttachment,
  EntityLink,
  LinkedEntityType,
  CapturedContext,
  ENTITY_CONFIG,
} from '@/types/discussions';

// =============================================================================
// IMAGE ATTACHMENT CARD
// =============================================================================

interface ImageAttachmentCardProps {
  attachment: MessageAttachment;
  onRemove?: () => void;
  showRemove?: boolean;
}

export function ImageAttachmentCard({ attachment, onRemove, showRemove }: ImageAttachmentCardProps) {
  const context: CapturedContext | null = attachment.capturedContext
    ? JSON.parse(attachment.capturedContext)
    : null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="relative group rounded-lg border bg-card overflow-hidden">
      {showRemove && onRemove && (
        <Button
          variant="destructive"
          size="icon"
          onClick={onRemove}
          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          aria-label="Xóa"
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      <Dialog>
        <DialogTrigger asChild>
          <button className="w-full">
            <div className="relative aspect-video">
              <img
                src={attachment.thumbnailUrl || attachment.fileUrl}
                alt={attachment.filename}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              {attachment.filename}
            </DialogTitle>
          </DialogHeader>
          <div className="relative overflow-auto max-h-[70vh]">
            <img
              src={attachment.fileUrl}
              alt={attachment.filename}
              className="w-full"
            />
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>{formatFileSize(attachment.fileSize)}</span>
              {attachment.width && attachment.height && (
                <span>{attachment.width} x {attachment.height}</span>
              )}
              {context?.url && (
                <span>From: <code className="text-xs">{context.url}</code></span>
              )}
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={attachment.fileUrl} download={attachment.filename}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="p-2">
        <p className="text-xs font-medium truncate">{attachment.filename}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
      </div>
    </div>
  );
}

// =============================================================================
// DOCUMENT ATTACHMENT CARD
// =============================================================================

interface DocumentAttachmentCardProps {
  attachment: MessageAttachment;
  onRemove?: () => void;
  showRemove?: boolean;
}

export function DocumentAttachmentCard({ attachment, onRemove, showRemove }: DocumentAttachmentCardProps) {
  const getFileIcon = () => {
    if (attachment.mimeType.includes('pdf')) return FileText;
    if (attachment.mimeType.includes('spreadsheet') || attachment.mimeType.includes('excel')) return FileStack;
    return File;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const FileIcon = getFileIcon();

  return (
    <div className="relative group flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      {showRemove && onRemove && (
        <Button
          variant="destructive"
          size="icon"
          onClick={onRemove}
          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Xóa"
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      <div className="p-2 rounded-lg bg-muted">
        <FileIcon className="h-6 w-6 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attachment.filename}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" asChild aria-label="Tải xuống">
            <a href={attachment.fileUrl} download={attachment.filename}>
              <Download className="h-4 w-4" />
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Download</TooltipContent>
      </Tooltip>
    </div>
  );
}

// =============================================================================
// ENTITY LINK CARD
// =============================================================================

const ENTITY_ICONS: Record<LinkedEntityType, React.ComponentType<{ className?: string }>> = {
  PART: Package,
  BOM: FileStack,
  WORK_ORDER: ClipboardList,
  PURCHASE_ORDER: ShoppingCart,
  SALES_ORDER: Receipt,
  SUPPLIER: Truck,
  CUSTOMER: Users,
  INVENTORY: Warehouse,
  QC_REPORT: CheckCircle,
  MRP_RUN: Calculator,
};

interface EntityLinkCardProps {
  entityLink: EntityLink;
  onRemove?: () => void;
  showRemove?: boolean;
  showQuickActions?: boolean;
}

export function EntityLinkCard({
  entityLink,
  onRemove,
  showRemove,
  showQuickActions = true,
}: EntityLinkCardProps) {
  const config = ENTITY_CONFIG[entityLink.entityType];
  const Icon = ENTITY_ICONS[entityLink.entityType];
  const entityUrl = `${config.urlPrefix}/${entityLink.entityId}`;
  const editUrl = `${config.urlPrefix}/${entityLink.entityId}/edit`;

  return (
    <div className="relative group flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      {showRemove && onRemove && (
        <Button
          variant="destructive"
          size="icon"
          onClick={onRemove}
          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Xóa"
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      <div className={cn(
        'p-2 rounded-lg',
        `bg-${config.color}-100 text-${config.color}-600`
      )}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{entityLink.entityTitle}</span>
          {entityLink.entityStatus && (
            <Badge variant="outline" className="text-[10px] h-4">
              {entityLink.entityStatus}
            </Badge>
          )}
        </div>
        {entityLink.entitySubtitle && (
          <p className="text-xs text-muted-foreground truncate">
            {entityLink.entitySubtitle}
          </p>
        )}
      </div>

      {showQuickActions && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild aria-label={`Xem ${config.label}`}>
                <Link href={entityUrl}>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>View {config.label}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild aria-label={`Chỉnh sửa ${config.label}`}>
                <Link href={editUrl}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit {config.label}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild aria-label="Mở trong tab mới">
                <Link href={entityUrl} target="_blank">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open in New Tab</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ATTACHMENT PREVIEW (FOR COMPOSER)
// =============================================================================

interface AttachmentPreviewProps {
  attachments: MessageAttachment[];
  entityLinks: EntityLink[];
  onRemoveAttachment: (index: number) => void;
  onRemoveEntityLink: (index: number) => void;
}

export function AttachmentPreview({
  attachments,
  entityLinks,
  onRemoveAttachment,
  onRemoveEntityLink,
}: AttachmentPreviewProps) {
  if (attachments.length === 0 && entityLinks.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 p-2 border-t">
      {/* Image attachments */}
      {attachments.filter(a => a.type === 'IMAGE').length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {attachments
            .map((attachment, index) => ({ attachment, index }))
            .filter(({ attachment }) => attachment.type === 'IMAGE')
            .map(({ attachment, index }) => (
              <ImageAttachmentCard
                key={index}
                attachment={attachment}
                showRemove
                onRemove={() => onRemoveAttachment(index)}
              />
            ))}
        </div>
      )}

      {/* Document attachments */}
      {attachments.filter(a => a.type !== 'IMAGE').length > 0 && (
        <div className="space-y-1">
          {attachments
            .map((attachment, index) => ({ attachment, index }))
            .filter(({ attachment }) => attachment.type !== 'IMAGE')
            .map(({ attachment, index }) => (
              <DocumentAttachmentCard
                key={index}
                attachment={attachment}
                showRemove
                onRemove={() => onRemoveAttachment(index)}
              />
            ))}
        </div>
      )}

      {/* Entity links */}
      {entityLinks.length > 0 && (
        <div className="space-y-1">
          {entityLinks.map((link, index) => (
            <EntityLinkCard
              key={index}
              entityLink={link}
              showRemove
              showQuickActions={false}
              onRemove={() => onRemoveEntityLink(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
