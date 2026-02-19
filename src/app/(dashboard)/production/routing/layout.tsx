import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quy trình sản xuất',
  description: 'Quản lý quy trình và bước sản xuất',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
