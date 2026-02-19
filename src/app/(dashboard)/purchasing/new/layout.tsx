import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tạo đơn mua mới',
  description: 'Tạo đơn đặt hàng mua nguyên vật liệu mới',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
