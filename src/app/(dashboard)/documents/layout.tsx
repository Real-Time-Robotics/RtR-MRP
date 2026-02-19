import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tài liệu',
  description: 'Quản lý tài liệu, bản vẽ kỹ thuật và hồ sơ',
};

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
