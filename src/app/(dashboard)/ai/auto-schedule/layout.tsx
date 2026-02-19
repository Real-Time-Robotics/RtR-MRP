import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lập lịch tự động',
  description: 'Lập lịch sản xuất tự động với tối ưu hóa AI',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
