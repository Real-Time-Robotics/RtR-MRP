import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Xuất từng phần',
  description: 'Quản lý xuất hàng từng phần cho lệnh sản xuất',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
