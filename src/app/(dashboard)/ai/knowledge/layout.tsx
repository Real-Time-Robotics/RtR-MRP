import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cơ sở tri thức AI',
  description: 'Quản lý cơ sở tri thức và dữ liệu huấn luyện AI',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
