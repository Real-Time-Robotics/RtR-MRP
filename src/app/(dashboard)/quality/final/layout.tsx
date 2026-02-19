import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kiểm tra cuối',
  description: 'Kiểm tra chất lượng thành phẩm trước khi xuất',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
