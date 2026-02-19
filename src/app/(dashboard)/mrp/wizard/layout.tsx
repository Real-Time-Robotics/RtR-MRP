import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hướng dẫn MRP',
  description: 'Hướng dẫn từng bước chạy MRP',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
