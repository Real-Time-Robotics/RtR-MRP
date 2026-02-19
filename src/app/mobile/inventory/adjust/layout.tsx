import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stock Adjustment',
  description: 'Adjust inventory stock levels from mobile device - Điều chỉnh tồn kho từ thiết bị di động',
};

export default function MobileInventoryAdjustLayout({ children }: { children: React.ReactNode }) {
  return children;
}
