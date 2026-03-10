"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import type { BomCostModule } from "@/hooks/cost-optimization/use-bom-cost";

interface CostByModuleChartProps {
  modules: BomCostModule[];
}

const MODULE_COLORS = [
  "#3182CE", "#38A169", "#D69E2E", "#E53E3E",
  "#805AD5", "#DD6B20", "#319795", "#D53F8C",
];

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: { moduleName: string; cost: number; percent: number; partCount: number };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white border rounded-lg shadow-lg p-3">
      <p className="font-medium">{item.moduleName}</p>
      <p className="font-mono text-sm">{formatCurrency(item.cost)}</p>
      <p className="text-xs text-muted-foreground">
        {item.percent.toFixed(1)}% — {item.partCount} parts
      </p>
    </div>
  );
}

export function CostByModuleChart({ modules }: CostByModuleChartProps) {
  if (modules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chi phi theo Module</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">Chưa có dữ liệu</p>
        </CardContent>
      </Card>
    );
  }

  const data = modules
    .sort((a, b) => b.cost - a.cost)
    .map((m) => ({
      moduleCode: m.moduleCode,
      moduleName: m.moduleName,
      cost: m.cost,
      percent: m.percent,
      partCount: m.partCount,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Chi phi theo Module</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v: number) => `$${(v / 1).toLocaleString()}`}
              fontSize={11}
            />
            <YAxis
              type="category"
              dataKey="moduleCode"
              width={60}
              fontSize={11}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="cost" radius={[0, 4, 4, 0]} maxBarSize={28}>
              {data.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={MODULE_COLORS[index % MODULE_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
