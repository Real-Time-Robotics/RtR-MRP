import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết vật tư',
  description: 'Xem chi tiết thông tin vật tư và linh kiện',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
