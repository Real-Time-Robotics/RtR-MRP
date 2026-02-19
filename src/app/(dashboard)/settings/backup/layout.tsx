import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sao lưu',
  description: 'Quản lý sao lưu và khôi phục dữ liệu',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
