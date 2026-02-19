import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cảnh báo AI',
  description: 'Hệ thống cảnh báo thông minh AI cho sản xuất và tồn kho',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
