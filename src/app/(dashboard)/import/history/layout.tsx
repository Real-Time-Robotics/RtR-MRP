import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lịch sử nhập',
  description: 'Lịch sử các phiên nhập dữ liệu',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
