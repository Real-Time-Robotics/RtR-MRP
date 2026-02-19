import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rủi ro nhà cung cấp',
  description: 'Đánh giá rủi ro nhà cung cấp bằng AI',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
