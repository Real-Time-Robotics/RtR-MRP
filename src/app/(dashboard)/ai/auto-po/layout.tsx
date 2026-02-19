import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Auto PO',
  description: 'Tự động tạo đơn đặt hàng mua với gợi ý từ AI',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
