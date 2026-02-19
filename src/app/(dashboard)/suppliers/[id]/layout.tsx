import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết nhà cung cấp',
  description: 'Xem chi tiết thông tin nhà cung cấp',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
