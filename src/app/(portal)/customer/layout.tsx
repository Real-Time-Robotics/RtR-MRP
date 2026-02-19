import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | RTR MRP',
    default: 'Customer Portal | RTR-MRP',
  },
  description: 'Customer portal dashboard - Overview of orders, deliveries, invoices, and support - Cổng khách hàng RTR-MRP',
};

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
