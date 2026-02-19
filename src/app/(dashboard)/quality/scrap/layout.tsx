import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Phế phẩm',
  description: 'Quản lý và theo dõi phế phẩm sản xuất',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
