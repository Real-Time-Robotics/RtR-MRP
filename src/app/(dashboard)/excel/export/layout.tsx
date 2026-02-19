import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Xuất Excel',
  description: 'Xuất dữ liệu hệ thống ra file Excel',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
