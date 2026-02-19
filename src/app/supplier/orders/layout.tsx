import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Purchase Orders',
  description: 'View and manage supplier purchase orders - Xem và quản lý đơn đặt hàng nhà cung cấp',
};

export default function SupplierOrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
