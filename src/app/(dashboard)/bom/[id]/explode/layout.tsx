import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Khai triển BOM',
  description: 'Khai triển chi tiết cấu trúc BOM đa cấp',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
