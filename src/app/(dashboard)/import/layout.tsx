import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nhập dữ liệu',
  description: 'Nhập dữ liệu từ file và lịch sử nhập liệu',
};

export default function ImportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
