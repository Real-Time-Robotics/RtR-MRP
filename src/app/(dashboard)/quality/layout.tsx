import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | RTR-MRP',
    default: 'Quality Management | RTR-MRP',
  },
  description: 'Quality inspections, NCR, CAPA, and lot traceability management - Kiểm tra chất lượng, NCR, CAPA và truy xuất nguồn gốc',
};

export default function QualityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
