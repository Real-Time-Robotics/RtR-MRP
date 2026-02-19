import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết khách hàng',
  description: 'Xem chi tiết thông tin khách hàng',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
