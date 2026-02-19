import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chất lượng AI',
  description: 'Phân tích chất lượng sản phẩm với trí tuệ nhân tạo',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
