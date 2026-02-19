import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết trung tâm SX',
  description: 'Xem chi tiết trung tâm sản xuất',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
