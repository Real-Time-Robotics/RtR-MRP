import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KPIs',
  description: 'Theo dõi chỉ số hiệu suất chính (KPIs) sản xuất',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
