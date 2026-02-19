import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Đơn hàng trễ',
  description: 'Quản lý đơn hàng chưa hoàn thành và trễ hạn',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
