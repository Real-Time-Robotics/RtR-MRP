import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chứng nhận chất lượng',
  description: 'Quản lý chứng nhận và giấy phép chất lượng',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
