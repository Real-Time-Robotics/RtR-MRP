import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Phân tích ABC',
  description: 'Phân tích ABC phân loại tồn kho theo giá trị',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
