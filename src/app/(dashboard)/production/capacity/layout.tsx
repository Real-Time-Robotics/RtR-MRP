import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Công suất',
  description: 'Quản lý và theo dõi công suất sản xuất',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
