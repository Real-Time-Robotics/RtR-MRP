import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tạo kiểm tra đầu vào',
  description: 'Tạo phiếu kiểm tra chất lượng đầu vào mới',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
