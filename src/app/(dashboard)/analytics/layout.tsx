import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | RTR-MRP',
    default: 'Analytics Dashboard | RTR-MRP',
  },
  description: 'Data analytics, KPIs, and custom dashboards for manufacturing insights - Phân tích dữ liệu, KPI và dashboard tùy chỉnh',
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
