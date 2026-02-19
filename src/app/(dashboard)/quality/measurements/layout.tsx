import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Đo lường',
  description: 'Ghi nhận và quản lý dữ liệu đo lường chất lượng',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
