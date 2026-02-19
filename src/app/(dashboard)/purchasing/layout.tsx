import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | RTR MRP',
    default: 'Mua hàng',
  },
  description: 'Quản lý đơn mua hàng, nhà cung cấp và quy trình mua sắm',
};

export default function PurchasingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
