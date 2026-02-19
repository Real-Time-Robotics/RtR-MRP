import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | RTR MRP',
    default: 'Kho hàng',
  },
  description: 'Quản lý tồn kho, xuất nhập kho và kiểm kê',
};

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
