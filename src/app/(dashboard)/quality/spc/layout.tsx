import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SPC',
  description: 'Kiểm soát quy trình thống kê (SPC)',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
