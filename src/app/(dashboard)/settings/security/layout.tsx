import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bảo mật',
  description: 'Cài đặt bảo mật tài khoản và xác thực',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
