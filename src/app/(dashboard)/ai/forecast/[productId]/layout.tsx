import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết dự báo',
  description: 'Xem chi tiết dự báo nhu cầu cho sản phẩm',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
