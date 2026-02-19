import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nhập thông minh',
  description: 'Nhập dữ liệu thông minh với hỗ trợ AI',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
