import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bộ lập lịch',
  description: 'Công cụ lập lịch sản xuất tự động',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
