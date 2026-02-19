import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Đề xuất AI',
  description: 'Đề xuất tối ưu hóa tồn kho và mua hàng từ AI',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
