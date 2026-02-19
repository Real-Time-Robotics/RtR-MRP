import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cycle Count',
  description: 'Mobile inventory cycle counting and stocktaking - Kiểm kê tồn kho trên di động',
};

export default function MobileInventoryCountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
