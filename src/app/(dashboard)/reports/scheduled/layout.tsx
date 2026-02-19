import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Báo cáo định kỳ',
  description: 'Quản lý báo cáo tự động định kỳ',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
