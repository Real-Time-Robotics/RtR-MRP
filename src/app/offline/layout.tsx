import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ngoại tuyến',
  description: 'Bạn đang ngoại tuyến - Kiểm tra kết nối mạng',
};

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
