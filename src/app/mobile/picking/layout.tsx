import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Picking',
  description: 'Mobile order picking and fulfillment - Lấy hàng và hoàn thành đơn trên di động',
};

export default function MobilePickingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
