import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tạo BOM mới',
  description: 'Tạo cấu trúc sản phẩm (BOM) mới',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
