import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mẫu Excel',
  description: 'Quản lý mẫu file Excel cho nhập xuất dữ liệu',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
