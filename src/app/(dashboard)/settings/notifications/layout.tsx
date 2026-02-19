import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cài đặt thông báo',
  description: 'Cài đặt thông báo và cảnh báo cá nhân',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
