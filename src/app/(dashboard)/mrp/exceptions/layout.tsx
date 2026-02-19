import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ngoại lệ MRP',
  description: 'Quản lý các ngoại lệ và cảnh báo MRP',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
