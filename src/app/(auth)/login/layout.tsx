import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to RTR-MRP manufacturing resource planning system - Đăng nhập vào hệ thống quản lý sản xuất RTR-MRP',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
