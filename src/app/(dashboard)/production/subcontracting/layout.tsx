import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gia công ngoài',
  description: 'Quản lý đơn hàng gia công ngoài',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
