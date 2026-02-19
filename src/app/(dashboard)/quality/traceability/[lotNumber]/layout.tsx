import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết truy xuất',
  description: 'Truy xuất nguồn gốc chi tiết theo số lô',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
