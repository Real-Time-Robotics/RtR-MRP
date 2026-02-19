import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tạo NCR mới',
  description: 'Tạo báo cáo không phù hợp mới',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
