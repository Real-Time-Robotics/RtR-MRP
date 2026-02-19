import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi phí sản xuất',
  description: 'Tính toán và theo dõi chi phí sản xuất',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
