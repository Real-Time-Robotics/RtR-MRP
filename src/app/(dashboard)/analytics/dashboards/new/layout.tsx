import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tạo Dashboard mới',
  description: 'Tạo bảng điều khiển phân tích mới',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
