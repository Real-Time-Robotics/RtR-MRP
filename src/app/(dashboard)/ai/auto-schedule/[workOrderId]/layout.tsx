import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết lịch sản xuất',
  description: 'Xem chi tiết lệnh sản xuất được lập lịch tự động',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
