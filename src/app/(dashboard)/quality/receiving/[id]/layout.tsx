import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết kiểm tra đầu vào',
  description: 'Xem chi tiết kết quả kiểm tra đầu vào',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
