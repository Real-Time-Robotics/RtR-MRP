import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Năng lực quy trình',
  description: 'Phân tích năng lực quy trình sản xuất (Cp, Cpk)',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
