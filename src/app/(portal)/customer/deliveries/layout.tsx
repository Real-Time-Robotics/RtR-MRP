import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Deliveries',
  description: 'Track and manage customer deliveries and shipments - Theo dõi giao hàng và vận chuyển',
};

export default function CustomerDeliveriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
