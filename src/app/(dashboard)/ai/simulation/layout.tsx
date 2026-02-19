import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mô phỏng AI',
  description: 'Mô phỏng chuỗi cung ứng và sản xuất với AI',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
