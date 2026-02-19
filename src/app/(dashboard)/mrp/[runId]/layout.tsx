import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết MRP Run',
  description: 'Xem chi tiết kết quả chạy MRP',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
