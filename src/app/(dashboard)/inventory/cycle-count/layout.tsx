import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kiểm kê',
  description: 'Kiểm kê định kỳ và đối chiếu tồn kho',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
