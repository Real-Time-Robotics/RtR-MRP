import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết đơn mua',
  description: 'Xem chi tiết đơn đặt hàng mua',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
