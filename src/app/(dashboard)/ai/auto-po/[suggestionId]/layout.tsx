import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết gợi ý PO',
  description: 'Xem chi tiết gợi ý đơn đặt hàng từ AI',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
