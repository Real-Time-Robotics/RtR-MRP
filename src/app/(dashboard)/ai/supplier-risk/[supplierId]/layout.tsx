import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết rủi ro NCC',
  description: 'Phân tích chi tiết rủi ro nhà cung cấp',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
