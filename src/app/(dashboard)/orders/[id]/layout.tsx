import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết đơn hàng',
  description: 'Xem chi tiết đơn hàng sản xuất',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
