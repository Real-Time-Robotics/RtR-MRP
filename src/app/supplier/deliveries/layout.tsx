import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Deliveries',
  description: 'Manage supplier deliveries and shipment tracking - Quản lý giao hàng và theo dõi vận chuyển nhà cung cấp',
};

export default function SupplierDeliveriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
