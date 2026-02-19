import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sửa chữa',
  description: 'Quản lý lệnh sửa chữa và tái chế sản phẩm',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
