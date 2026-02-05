'use client';

import { useState } from 'react';
import {
  Calculator,
  Download,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Package,
  Percent
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCosting,
  CostingTable,
  CostingBreakdownCard,
  DEFAULT_COSTING_PARAMS,
} from '@/components/costing';

export default function CostingPage() {
  const {
    costings,
    summary,
    isLoading,
    selectedPart,
    selectPart,
    recalculateAll,
    exportToCSV,
    refresh,
  } = useCosting({ useDemoData: true });

  const [exchangeRate, setExchangeRate] = useState(DEFAULT_COSTING_PARAMS.exchangeRate);

  const handleExchangeRateChange = (value: string) => {
    const rate = parseFloat(value);
    if (!isNaN(rate) && rate > 0) {
      setExchangeRate(rate);
    }
  };

  const handleRecalculate = () => {
    recalculateAll(exchangeRate);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `₫${(value / 1000000000).toFixed(2)}B`;
    }
    if (value >= 1000000) {
      return `₫${(value / 1000000).toFixed(2)}M`;
    }
    return `₫${value.toLocaleString()}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-6 h-6" />
            Landed Cost Calculator
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Calculate and manage product costing with import taxes and margins
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Total Parts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSKUs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Avg Unit Cost
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.avgUnitCost.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Landed Value
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalLandedValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Avg Margin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {(summary.avgMargin * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exchange Rate Control */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Exchange Rate Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="exchangeRate" className="text-sm">
                VND/USD Exchange Rate
              </Label>
              <Input
                id="exchangeRate"
                type="number"
                value={exchangeRate}
                onChange={(e) => handleExchangeRateChange(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleRecalculate}>
              <Calculator className="w-4 h-4 mr-2" />
              Recalculate All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Costing Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Part Costings</CardTitle>
              <CardDescription>
                Click a row to see detailed breakdown
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-slate-500">
                  Loading costings...
                </div>
              ) : (
                <CostingTable
                  costings={costings}
                  onRowClick={selectPart}
                  selectedId={selectedPart?.id}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Breakdown Card */}
        <div>
          {selectedPart ? (
            <CostingBreakdownCard costing={selectedPart} showDetails={true} />
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-slate-500">
                Select a part to see cost breakdown
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
