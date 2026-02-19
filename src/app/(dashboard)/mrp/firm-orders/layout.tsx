import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Đơn hàng cố định',
  description: 'Quản lý đơn hàng cố định trong MRP',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
