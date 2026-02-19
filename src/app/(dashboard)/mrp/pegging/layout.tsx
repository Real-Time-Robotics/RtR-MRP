import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pegging MRP',
  description: 'Truy xuất nguồn nhu cầu và cung ứng MRP',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
