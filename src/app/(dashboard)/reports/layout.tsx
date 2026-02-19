import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | RTR-MRP',
    default: 'Reports | RTR-MRP',
  },
  description: 'Production, inventory, financial, and automated reports - Báo cáo sản xuất, tồn kho, tài chính và báo cáo tự động',
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
