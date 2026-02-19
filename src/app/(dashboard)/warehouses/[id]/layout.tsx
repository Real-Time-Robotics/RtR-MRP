import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết kho hàng',
  description: 'Xem chi tiết thông tin kho hàng',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
