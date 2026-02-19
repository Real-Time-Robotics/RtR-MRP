import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mô phỏng kịch bản',
  description: 'Mô phỏng và phân tích kịch bản sản xuất với AI',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
