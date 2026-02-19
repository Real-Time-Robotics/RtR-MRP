import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lịch sản xuất',
  description: 'Lập lịch và theo dõi kế hoạch sản xuất',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
