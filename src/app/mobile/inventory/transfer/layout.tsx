import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stock Transfer',
  description: 'Transfer inventory between warehouse locations - Chuyển kho giữa các vị trí lưu trữ',
};

export default function MobileInventoryTransferLayout({ children }: { children: React.ReactNode }) {
  return children;
}
