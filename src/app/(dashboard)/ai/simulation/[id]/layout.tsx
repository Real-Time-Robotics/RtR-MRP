import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết mô phỏng',
  description: 'Xem chi tiết kết quả mô phỏng AI',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
