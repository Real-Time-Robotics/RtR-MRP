import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cảnh báo',
  description: 'Quản lý cảnh báo hệ thống và thông báo quan trọng',
};

export default function AlertsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
