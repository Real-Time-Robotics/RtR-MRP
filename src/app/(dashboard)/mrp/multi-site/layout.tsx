import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MRP đa nhà máy',
  description: 'Hoạch định MRP cho nhiều nhà máy',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
