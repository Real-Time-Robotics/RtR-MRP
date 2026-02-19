import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kế hoạch kiểm tra',
  description: 'Quản lý kế hoạch kiểm tra chất lượng sản phẩm',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
