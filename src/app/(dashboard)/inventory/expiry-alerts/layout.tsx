import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cảnh báo hết hạn',
  description: 'Cảnh báo nguyên vật liệu sắp hết hạn sử dụng',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
