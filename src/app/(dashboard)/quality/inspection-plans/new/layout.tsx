import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tạo kế hoạch kiểm tra',
  description: 'Tạo kế hoạch kiểm tra chất lượng mới',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
