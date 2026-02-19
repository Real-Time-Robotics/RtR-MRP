import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tạo lệnh sản xuất',
  description: 'Tạo lệnh sản xuất mới',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
