import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hàng tạm giữ',
  description: 'Quản lý hàng hóa tạm giữ chờ kiểm tra chất lượng',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
