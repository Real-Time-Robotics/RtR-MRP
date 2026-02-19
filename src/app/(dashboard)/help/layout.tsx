import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trợ giúp',
  description: 'Hướng dẫn sử dụng và tài liệu hỗ trợ RTR MRP',
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
