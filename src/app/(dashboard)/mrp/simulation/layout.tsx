import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mô phỏng MRP',
  description: 'Mô phỏng và phân tích kịch bản MRP',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
