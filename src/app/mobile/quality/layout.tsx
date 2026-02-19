import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quality Inspection',
  description: 'Mobile quality inspection and checks - Kiểm tra chất lượng trên di động',
};

export default function MobileQualityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
