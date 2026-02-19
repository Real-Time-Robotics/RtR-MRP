import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: '%s | RTR-MRP',
    default: 'Sign In | RTR-MRP',
  },
  description: 'Sign in to RTR-MRP manufacturing resource planning system - Đăng nhập vào hệ thống quản lý sản xuất RTR-MRP',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {children}
    </div>
  );
}
