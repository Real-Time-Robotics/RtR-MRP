import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dự báo Lead Time',
  description: 'Dự báo thời gian giao hàng nhà cung cấp bằng AI',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
