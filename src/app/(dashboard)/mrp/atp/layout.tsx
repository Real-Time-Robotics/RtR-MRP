import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ATP',
  description: 'Kiểm tra khả năng cung ứng (Available to Promise)',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
