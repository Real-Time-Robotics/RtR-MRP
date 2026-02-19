import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kiểm tra đầu vào',
  description: 'Kiểm tra chất lượng nguyên vật liệu đầu vào',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
