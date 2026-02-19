import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Di chuyển dữ liệu',
  description: 'Công cụ di chuyển và chuyển đổi dữ liệu hệ thống',
};

export default function DataMigrationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
