import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Invoices',
  description: 'View and manage customer invoices and payment history - Xem và quản lý hóa đơn khách hàng',
};

export default function CustomerInvoicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
