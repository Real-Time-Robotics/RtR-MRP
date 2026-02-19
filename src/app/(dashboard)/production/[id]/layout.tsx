import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết lệnh sản xuất',
  description: 'Xem chi tiết lệnh sản xuất',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
