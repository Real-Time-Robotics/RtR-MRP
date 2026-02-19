import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your RTR-MRP account password - Dat lai mat khau tai khoan RTR-MRP',
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
