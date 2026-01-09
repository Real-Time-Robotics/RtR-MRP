"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { ForecastChart } from "@/components/ai/forecast-chart";
import { TrendIndicator } from "@/components/ai/trend-indicator";
import { ConfidenceBadge } from "@/components/ai/confidence-badge";
import {
  generateDemandForecast,
  generateMockHistoricalData,
} from "@/lib/ai/forecasting";
import { DataTable, Column } from "@/components/ui-v2/data-table";

interface Product {
  id: string;
  sku: string;
  name: string;
}

export default function ForecastPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [horizon, setHorizon] = useState("4");
  const [chartData, setChartData] = useState<
    Array<{
      period: string;
      actual?: number;
      forecast?: number;
      lowerBound?: number;
      upperBound?: number;
    }>
  >([]);
  const [forecastResults, setForecastResults] = useState<
    Array<{
      period: string;
      forecast: number;
      lowerBound: number;
      upperBound: number;
      confidence: number;
      trend: string;
    }>
  >([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      generateForecast();
    }
  }, [selectedProduct, horizon]);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
      if (data.length > 0) {
        setSelectedProduct(data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateForecast = () => {
    // Generate mock historical data
    const historical = generateMockHistoricalData(selectedProduct, 8);
    const forecasts = generateDemandForecast(historical, parseInt(horizon));

    // Combine for chart
    const combined = [
      ...historical.map((h) => ({
        period: h.period,
        actual: h.quantity,
      })),
      ...forecasts.map((f) => ({
        period: f.period,
        forecast: f.forecast,
        lowerBound: f.lowerBound,
        upperBound: f.upperBound,
      })),
    ];

    setChartData(combined);
    setForecastResults(forecasts);
  };

  const selectedProductName =
    products.find((p) => p.id === selectedProduct)?.name || "Product";

  const forecastColumns: Column<{
    period: string;
    forecast: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
    trend: string;
  }>[] = useMemo(() => [
    {
      key: 'period',
      header: 'Period',
      width: '100px',
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'forecast',
      header: 'Forecast',
      width: '100px',
      align: 'right',
      sortable: true,
      render: (value) => <span className="text-lg font-bold">{value}</span>,
    },
    {
      key: 'range',
      header: 'Range',
      width: '120px',
      align: 'right',
      render: (_, row) => (
        <span className="text-muted-foreground">
          {row.lowerBound} - {row.upperBound}
        </span>
      ),
    },
    {
      key: 'confidence',
      header: 'Confidence',
      width: '100px',
      align: 'center',
      sortable: true,
      render: (value) => <ConfidenceBadge confidence={value} />,
    },
    {
      key: 'trend',
      header: 'Trend',
      width: '100px',
      align: 'center',
      render: (value) => (
        <TrendIndicator trend={value as "increasing" | "stable" | "decreasing"} />
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demand Forecasting"
        description="AI-powered demand predictions for your products"
        backHref="/ai"
        actions={
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Forecast
          </Button>
        }
      />

      {/* Controls */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Product</label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Select product..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Horizon</label>
            <Select value={horizon} onValueChange={setHorizon}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 quarters</SelectItem>
                <SelectItem value="8">8 quarters</SelectItem>
                <SelectItem value="12">12 quarters</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="pt-6">
            <Button variant="outline" onClick={generateForecast}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Demand Forecast - {selectedProductName}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ForecastChart data={chartData} />
          )}
        </CardContent>
      </Card>

      {/* Forecast Table */}
      <Card>
        <CardHeader>
          <CardTitle>Forecast Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={forecastResults}
            columns={forecastColumns}
            keyField="period"
            emptyMessage="No forecast data available"
            searchable={false}
            stickyHeader
            excelMode={{
              enabled: true,
              showRowNumbers: true,
              columnHeaderStyle: 'field-names',
              gridBorders: true,
              showFooter: true,
              sheetName: 'Forecast',
              compactMode: true,
            }}
          />
        </CardContent>
      </Card>

      {/* Contributing Factors */}
      <Card>
        <CardHeader>
          <CardTitle>Contributing Factors</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-blue-500">*</span>
              <span>
                <strong>Seasonality:</strong> Q2-Q3 typically higher (agriculture
                season)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">*</span>
              <span>
                <strong>Trend:</strong> Year-over-year growth of 22%
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">*</span>
              <span>
                <strong>Pipeline:</strong> 3 large government contracts in
                discussion
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">*</span>
              <span>
                <strong>Market:</strong> Drone industry growing 15% annually
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
