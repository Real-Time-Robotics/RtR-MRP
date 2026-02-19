import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Phiên bản BOM',
  description: 'Quản lý phiên bản cấu trúc sản phẩm',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
