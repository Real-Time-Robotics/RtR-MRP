import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OEE',
  description: 'Hiệu suất thiết bị tổng thể (OEE)',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
