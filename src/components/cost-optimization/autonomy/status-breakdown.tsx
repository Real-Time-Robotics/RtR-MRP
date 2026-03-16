"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { AutonomySummary } from "@/hooks/cost-optimization/use-autonomy";

interface StatusBreakdownProps {
  summary: AutonomySummary;
}

const statusConfig = [
  { key: "MAKE", label: "Tu san xuat", color: "#22c55e" },
  { key: "IN_DEVELOPMENT", label: "Dang phat trien", color: "#3b82f6" },
  { key: "EVALUATE", label: "Dang danh gia", color: "#eab308" },
  { key: "BUY_STRATEGIC", label: "Mua chien luoc", color: "#f97316" },
  { key: "BUY_REQUIRED", label: "Phai mua", color: "#ef4444" },
];

export function StatusBreakdown({ summary }: StatusBreakdownProps) {
  const data = statusConfig
    .map((s) => ({
      name: s.label,
      value: summary.byStatus[s.key as keyof typeof summary.byStatus],
      color: s.color,
    }))
    .filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Phan bo trang thai</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [Number(value), "Parts"]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
