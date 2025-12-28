"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useLanguage } from "@/lib/i18n/language-context";

interface OrderStatusData {
  name: string;
  value: number;
  color: string;
}

interface OrderStatusChartProps {
  data: OrderStatusData[];
}

export function OrderStatusChart({ data }: OrderStatusChartProps) {
  const { t } = useLanguage();

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("dashboard.orderStatus")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            {t("dashboard.noOrderData")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t("dashboard.orderStatus")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full" style={{ minWidth: 200, minHeight: 200 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 0, bottom: 0, left: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => [value, "Orders"]}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
