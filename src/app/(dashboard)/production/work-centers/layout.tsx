import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trung tâm sản xuất',
  description: 'Quản lý trung tâm sản xuất và máy móc',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
