"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n/language-context";

interface OrderStatusData {
  name: string;
  value: number;
  color: string;
}

interface OrderStatusChartProps {
  data: OrderStatusData[];
}

// Simple custom bar chart without Recharts to avoid background issues
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

  // Calculate max value for scaling
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t("dashboard.orderStatus")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-4">
              {/* Label */}
              <div className="w-24 text-sm text-muted-foreground text-right shrink-0">
                {item.name}
              </div>
              {/* Bar container */}
              <div className="flex-1 h-6 bg-muted/30 rounded-md overflow-hidden">
                {/* Bar */}
                <div
                  className="h-full rounded-md transition-all duration-500 ease-out flex items-center justify-end pr-2"
                  style={{
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: item.color,
                    minWidth: item.value > 0 ? '2rem' : '0',
                  }}
                >
                  {item.value > 0 && (
                    <span className="text-xs font-medium text-white">
                      {item.value}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
