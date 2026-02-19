import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tạo kiểm tra cuối',
  description: 'Tạo phiếu kiểm tra chất lượng thành phẩm mới',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
