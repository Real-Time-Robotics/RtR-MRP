import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dự báo AI',
  description: 'Dự báo nhu cầu sản phẩm với trí tuệ nhân tạo',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
