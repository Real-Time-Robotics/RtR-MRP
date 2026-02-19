import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Báo cáo tài chính',
  description: 'Báo cáo tài chính và phân tích chi phí',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
