import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kiểm tra trong quy trình',
  description: 'Kiểm tra chất lượng trong quy trình sản xuất',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
