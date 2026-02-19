import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nhập email AI',
  description: 'Nhập đơn hàng tự động từ email với phân tích AI',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
