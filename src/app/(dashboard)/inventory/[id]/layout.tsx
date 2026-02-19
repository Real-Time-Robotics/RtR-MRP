import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết tồn kho',
  description: 'Xem chi tiết thông tin tồn kho sản phẩm',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
