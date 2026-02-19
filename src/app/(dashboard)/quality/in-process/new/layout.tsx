import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tạo kiểm tra quy trình',
  description: 'Tạo phiếu kiểm tra chất lượng trong quy trình mới',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
