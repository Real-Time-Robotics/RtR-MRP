import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tạo quy trình mới',
  description: 'Tạo quy trình sản xuất mới',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
