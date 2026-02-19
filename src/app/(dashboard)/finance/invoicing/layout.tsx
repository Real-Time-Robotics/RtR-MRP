import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hóa đơn',
  description: 'Quản lý hóa đơn mua hàng và bán hàng',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
