import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chỉnh sửa Dashboard',
  description: 'Chỉnh sửa bảng điều khiển phân tích',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
