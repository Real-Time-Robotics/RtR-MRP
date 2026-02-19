import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NCR',
  description: 'Quản lý báo cáo không phù hợp (NCR)',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
