import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thiết bị',
  description: 'Quản lý thiết bị và máy móc sản xuất',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
