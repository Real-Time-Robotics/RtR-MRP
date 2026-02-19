import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | RTR-MRP',
    default: 'Production Management | RTR-MRP',
  },
  description: 'Manage work orders, production schedules, and manufacturing capacity - Quản lý lệnh sản xuất, lịch trình và năng lực sản xuất',
};

export default function ProductionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
