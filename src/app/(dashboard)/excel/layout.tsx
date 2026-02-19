import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Excel',
  description: 'Nhập xuất dữ liệu Excel và quản lý mẫu báo cáo',
};

export default function ExcelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
