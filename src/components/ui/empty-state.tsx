// src/components/ui/empty-state.tsx
"use client";

import { cn } from "@/lib/utils";
import {
  Package,
  FileText,
  Users,
  ShoppingCart,
  Warehouse,
  AlertTriangle,
  Search,
  Plus,
  FileQuestion,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "compact" | "inline";
  className?: string;
}

// Preset configurations for common empty states
export const EMPTY_STATE_PRESETS = {
  noData: {
    icon: FileQuestion,
    title: "No data found",
    description: "There's nothing here yet. Get started by adding your first item.",
  },
  noResults: {
    icon: Search,
    title: "No results found",
    description: "Try adjusting your search or filter criteria.",
  },
  noParts: {
    icon: Package,
    title: "No parts found",
    description: "Start by adding parts to your inventory.",
  },
  noOrders: {
    icon: ShoppingCart,
    title: "No orders yet",
    description: "Orders will appear here once they're created.",
  },
  noSuppliers: {
    icon: Users,
    title: "No suppliers added",
    description: "Add suppliers to manage your supply chain.",
  },
  noInventory: {
    icon: Warehouse,
    title: "No inventory records",
    description: "Inventory records will appear here after parts are received.",
  },
  noDocuments: {
    icon: FileText,
    title: "No documents",
    description: "Upload or create documents to see them here.",
  },
  error: {
    icon: AlertTriangle,
    title: "Something went wrong",
    description: "We encountered an error loading this content.",
  },
} as const;

export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  className,
}: EmptyStateProps) {
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-3 py-4 text-muted-foreground", className)}>
        <Icon className="h-5 w-5" />
        <span className="text-sm">{title}</span>
        {action && (
          <Button size="sm" variant="ghost" onClick={action.onClick}>
            {action.icon && <action.icon className="mr-1 h-4 w-4" />}
            {action.label}
          </Button>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-col items-center py-8 text-center", className)}>
        <div className="rounded-full bg-muted p-3">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-3 text-sm font-medium">{title}</h3>
        {description && (
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
        )}
        {action && (
          <Button size="sm" className="mt-3" onClick={action.onClick}>
            {action.icon && <action.icon className="mr-1 h-4 w-4" />}
            {action.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      <div className="rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      <div className="mt-6 flex gap-3">
        {action && (
          <Button onClick={action.onClick}>
            {action.icon ? (
              <action.icon className="mr-2 h-4 w-4" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

// Convenience components for common empty states
export function NoDataFound(props: Partial<EmptyStateProps>) {
  return <EmptyState {...EMPTY_STATE_PRESETS.noData} {...props} />;
}

export function NoResultsFound(props: Partial<EmptyStateProps>) {
  return <EmptyState {...EMPTY_STATE_PRESETS.noResults} {...props} />;
}

export function NoPartsFound(props: Partial<EmptyStateProps>) {
  return <EmptyState {...EMPTY_STATE_PRESETS.noParts} {...props} />;
}

export function NoOrdersFound(props: Partial<EmptyStateProps>) {
  return <EmptyState {...EMPTY_STATE_PRESETS.noOrders} {...props} />;
}

export function NoSuppliersFound(props: Partial<EmptyStateProps>) {
  return <EmptyState {...EMPTY_STATE_PRESETS.noSuppliers} {...props} />;
}
