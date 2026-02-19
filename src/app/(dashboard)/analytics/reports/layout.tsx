import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Báo cáo phân tích',
  description: 'Báo cáo phân tích dữ liệu sản xuất và kinh doanh',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
