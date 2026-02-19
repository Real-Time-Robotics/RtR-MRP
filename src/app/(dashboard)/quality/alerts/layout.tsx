import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cảnh báo chất lượng',
  description: 'Cảnh báo và thông báo về vấn đề chất lượng',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
