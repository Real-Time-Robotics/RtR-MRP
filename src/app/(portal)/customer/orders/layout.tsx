import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Orders',
  description: 'View and track customer orders and order history - Xem và theo dõi đơn hàng khách hàng',
};

export default function CustomerOrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
