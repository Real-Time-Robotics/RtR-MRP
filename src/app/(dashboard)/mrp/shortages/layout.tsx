import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thiếu hàng',
  description: 'Theo dõi và xử lý tình trạng thiếu hàng',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
