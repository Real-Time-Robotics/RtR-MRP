import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Performance',
  description: 'Supplier performance metrics, ratings, and delivery analytics - Chỉ số hiệu suất, đánh giá và phân tích giao hàng nhà cung cấp',
};

export default function SupplierPerformanceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
