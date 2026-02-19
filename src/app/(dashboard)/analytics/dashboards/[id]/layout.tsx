import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết Dashboard',
  description: 'Xem chi tiết bảng điều khiển phân tích',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
