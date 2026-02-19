import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Work Orders',
  description: 'Mobile work order management and production tracking - Quản lý lệnh sản xuất trên di động',
};

export default function MobileWorkorderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
