import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tạo đơn hàng mới',
  description: 'Tạo đơn hàng sản xuất mới',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
