import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Truy xuất nguồn gốc',
  description: 'Truy xuất nguồn gốc sản phẩm theo lô',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
