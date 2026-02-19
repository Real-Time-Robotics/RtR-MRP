import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to RTR-MRP manufacturing resource planning system - Dang nhap vao he thong quan ly san xuat RTR-MRP',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
