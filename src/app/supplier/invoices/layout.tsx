import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Invoices',
  description: 'Manage supplier invoices and payment status - Quản lý hóa đơn và trạng thái thanh toán nhà cung cấp',
};

export default function SupplierInvoicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
