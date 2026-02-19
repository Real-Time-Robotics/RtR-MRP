// src/components/ui/error-boundary.tsx
"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { clientLogger } from "@/lib/client-logger";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    // Log error for observability
    clientLogger.error("Error caught by ErrorBoundary", error);
    clientLogger.error("Component stack", errorInfo.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          showDetails={this.props.showDetails}
          className={this.props.className}
        />
      );
    }

    return this.props.children;
  }
}

// Error fallback component
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo?: ErrorInfo | null;
  onRetry?: () => void;
  showDetails?: boolean;
  variant?: "full" | "card" | "inline";
  className?: string;
}

export function ErrorFallback({
  error,
  errorInfo,
  onRetry,
  showDetails = process.env.NODE_ENV === "development",
  variant = "card",
  className,
}: ErrorFallbackProps) {
  const isDev = process.env.NODE_ENV === "development";

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3",
          className
        )}
      >
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <span className="flex-1 text-sm text-destructive">
          {error?.message || "Có lỗi xảy ra"}
        </span>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Thử lại
          </Button>
        )}
      </div>
    );
  }

  if (variant === "full") {
    return (
      <div
        className={cn(
          "flex min-h-[400px] flex-col items-center justify-center p-8",
          className
        )}
      >
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">Có lỗi xảy ra</h1>
        <p className="mt-2 max-w-md text-center text-muted-foreground">
          Đã xảy ra lỗi không mong muốn. Vui lòng thử lại hoặc liên hệ hỗ trợ nếu
          vấn đề vẫn tiếp diễn.
        </p>

        {showDetails && error && (
          <div className="mt-6 max-w-2xl overflow-auto rounded-lg bg-muted p-4">
            <p className="font-mono text-sm text-destructive">{error.message}</p>
            {isDev && errorInfo && (
              <pre className="mt-2 text-xs text-muted-foreground">
                {errorInfo.componentStack}
              </pre>
            )}
          </div>
        )}

        <div className="mt-8 flex gap-3">
          {onRetry && (
            <Button onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Thử lại
            </Button>
          )}
          <Button variant="outline" onClick={() => window.location.href = "/"}>
            <Home className="mr-2 h-4 w-4" />
            Về trang chủ
          </Button>
        </div>
      </div>
    );
  }

  // Default card variant
  return (
    <Card className={cn("border-destructive/50", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Lỗi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {error?.message || "Đã xảy ra lỗi không mong muốn khi tải nội dung này."}
        </p>
        {showDetails && isDev && errorInfo && (
          <pre className="mt-4 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
            {errorInfo.componentStack}
          </pre>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        {onRetry && (
          <Button size="sm" onClick={onRetry}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Thử lại
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => window.location.reload()}>
          Tải lại trang
        </Button>
      </CardFooter>
    </Card>
  );
}

// Async error handler for data fetching
export function AsyncErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      onRetry={resetErrorBoundary}
      variant="card"
    />
  );
}

// Hook for error handling in async operations
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
    clientLogger.error("Async error", error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}

// Error message component for forms
export function FormErrorMessage({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  if (!message) return null;

  return (
    <p className={cn("text-sm text-destructive", className)}>
      {message}
    </p>
  );
}

// API error display
export function ApiError({
  error,
  onRetry,
  className,
}: {
  error: { message: string; code?: string; status?: number };
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-destructive/50 bg-destructive/5 p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
        <div className="flex-1">
          <h4 className="font-medium text-destructive">
            {error.code || "Lỗi"}
            {error.status && ` (${error.status})`}
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Thử lại
          </Button>
        )}
      </div>
    </div>
  );
}
