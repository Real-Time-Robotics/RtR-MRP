import type { Metadata } from 'next';
import { SupplierLayoutClient } from './supplier-layout-client';

export const metadata: Metadata = {
  title: {
    template: '%s | RTR MRP',
    default: 'Cổng nhà cung cấp',
  },
  description: 'Cổng thông tin nhà cung cấp RTR MRP - Quản lý đơn hàng, giao hàng và hóa đơn',
};

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  return <SupplierLayoutClient>{children}</SupplierLayoutClient>;
}
