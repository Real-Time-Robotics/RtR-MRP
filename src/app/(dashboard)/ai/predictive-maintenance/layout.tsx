import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bảo trì dự báo',
  description: 'Giám sát thiết bị và dự báo bảo trì với AI',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
