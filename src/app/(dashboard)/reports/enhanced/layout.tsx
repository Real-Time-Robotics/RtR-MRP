import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Báo cáo nâng cao',
  description: 'Báo cáo nâng cao với biểu đồ và phân tích',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
