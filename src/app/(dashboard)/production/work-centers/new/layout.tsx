import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tạo trung tâm SX mới',
  description: 'Tạo trung tâm sản xuất mới',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
