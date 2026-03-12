"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  MoreHorizontal,
  RefreshCw,
  Eye,
  Download,
  Brain,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { AccuracyBadge } from "./accuracy-metrics";

// =============================================================================
// TYPES
// =============================================================================

interface ForecastItem {
  productId: string;
  productName: string;
  productSku: string;
  nextPeriod: {
    period: string;
    quantity: number;
  };
  trend: "up" | "down" | "stable";
  confidence: number;
  accuracy?: number;
  model: string;
  generatedAt: string;
}

interface ForecastTableProps {
  forecasts: ForecastItem[];
  isLoading?: boolean;
  onRefresh?: (productId: string) => void;
  onViewDetails?: (productId: string) => void;
  onExport?: (productId: string) => void;
  showPagination?: boolean;
  pageSize?: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getTrendIcon(trend: string) {
  switch (trend) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "down":
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-gray-500" />;
  }
}

function getTrendBadge(trend: string) {
  switch (trend) {
    case "up":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0">
          <TrendingUp className="h-3 w-3 mr-1" />
          Increasing
        </Badge>
      );
    case "down":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-0">
          <TrendingDown className="h-3 w-3 mr-1" />
          Decreasing
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-0">
          <Minus className="h-3 w-3 mr-1" />
          Stable
        </Badge>
      );
  }
}

function formatDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ForecastTable({
  forecasts,
  isLoading = false,
  onRefresh,
  onViewDetails,
  onExport,
  showPagination = true,
  pageSize = 10,
}: ForecastTableProps) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter forecasts
  const filteredForecasts = forecasts.filter(
    (f) =>
      f.productName.toLowerCase().includes(search.toLowerCase()) ||
      f.productSku.toLowerCase().includes(search.toLowerCase())
  );

  // Paginate
  const totalPages = Math.ceil(filteredForecasts.length / pageSize);
  const paginatedForecasts = filteredForecasts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (forecasts.length === 0 && !isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-muted-foreground py-8">
            <Brain className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No forecasts available</p>
            <p className="text-sm">Generate forecasts to see predictions here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm font-medium">Demand Forecasts</CardTitle>
          <div className="flex-1" />
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Next Period</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead className="text-center">Confidence</TableHead>
                <TableHead className="text-center">Accuracy</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Updated</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    <span className="text-muted-foreground">Loading forecasts...</span>
                  </TableCell>
                </TableRow>
              ) : paginatedForecasts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No forecasts match your search
                  </TableCell>
                </TableRow>
              ) : (
                paginatedForecasts.map((forecast) => (
                  <TableRow key={forecast.productId}>
                    <TableCell>
                      <div>
                        <Link
                          href={`/ai/forecast/${forecast.productId}`}
                          className="font-medium hover:underline"
                        >
                          {forecast.productName}
                        </Link>
                        <p className="text-xs text-muted-foreground">{forecast.productSku}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <span className="font-medium">
                          {forecast.nextPeriod.quantity.toLocaleString()}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {forecast.nextPeriod.period}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getTrendBadge(forecast.trend)}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          forecast.confidence >= 0.85
                            ? "bg-green-100 text-green-800 border-0"
                            : forecast.confidence >= 0.7
                              ? "bg-blue-100 text-blue-800 border-0"
                              : "bg-amber-100 text-amber-800 border-0"
                        }
                      >
                        <Brain className="h-3 w-3 mr-1" />
                        {(forecast.confidence * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {forecast.accuracy !== undefined ? (
                        <AccuracyBadge mape={100 - forecast.accuracy} size="sm" />
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono">{forecast.model}</span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDate(forecast.generatedAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Menu">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onViewDetails?.(forecast.productId)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onRefresh?.(forecast.productId)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh Forecast
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onExport?.(forecast.productId)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {showPagination && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredForecasts.length)} of{" "}
              {filteredForecasts.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SIMPLE LIST VERSION
// =============================================================================

export function ForecastList({
  forecasts,
  limit = 5,
  onViewAll,
}: {
  forecasts: ForecastItem[];
  limit?: number;
  onViewAll?: () => void;
}) {
  return (
    <div className="space-y-3">
      {forecasts.slice(0, limit).map((forecast) => (
        <Link
          key={forecast.productId}
          href={`/ai/forecast/${forecast.productId}`}
          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {getTrendIcon(forecast.trend)}
            <div>
              <p className="font-medium text-sm">{forecast.productName}</p>
              <p className="text-xs text-muted-foreground">{forecast.productSku}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium">{forecast.nextPeriod.quantity.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{forecast.nextPeriod.period}</p>
          </div>
        </Link>
      ))}
      {onViewAll && forecasts.length > limit && (
        <Button variant="outline" className="w-full" onClick={onViewAll}>
          View All Forecasts
        </Button>
      )}
    </div>
  );
}
