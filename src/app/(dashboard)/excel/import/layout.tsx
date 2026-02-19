import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nhập Excel',
  description: 'Nhập dữ liệu từ file Excel vào hệ thống',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
