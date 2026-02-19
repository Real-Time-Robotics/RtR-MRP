import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Phân tích NCC AI',
  description: 'Phân tích và đánh giá nhà cung cấp với AI',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
