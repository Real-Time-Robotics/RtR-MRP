import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Phân tích AI',
  description: 'Phân tích và phát hiện bất thường bằng AI',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
