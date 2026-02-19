import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hồ sơ cá nhân',
  description: 'Quản lý thông tin hồ sơ cá nhân và tài khoản',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
