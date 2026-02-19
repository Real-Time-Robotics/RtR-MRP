import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết cảnh báo AI',
  description: 'Xem chi tiết và xử lý cảnh báo AI',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
