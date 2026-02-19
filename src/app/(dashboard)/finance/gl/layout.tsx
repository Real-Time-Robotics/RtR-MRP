import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sổ cái',
  description: 'Quản lý sổ cái kế toán tổng hợp',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
