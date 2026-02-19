import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Phê duyệt',
  description: 'Quản lý quy trình phê duyệt đơn hàng và yêu cầu',
};

export default function ApprovalsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
