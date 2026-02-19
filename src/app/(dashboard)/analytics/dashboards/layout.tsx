import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bảng điều khiển',
  description: 'Quản lý bảng điều khiển phân tích tùy chỉnh',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
