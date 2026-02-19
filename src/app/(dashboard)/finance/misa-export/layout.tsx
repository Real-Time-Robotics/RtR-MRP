import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Xuất MISA',
  description: 'Xuất dữ liệu sang phần mềm kế toán MISA',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
