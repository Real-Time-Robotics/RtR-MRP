import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết chất lượng AI',
  description: 'Phân tích chất lượng chi tiết cho linh kiện',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
