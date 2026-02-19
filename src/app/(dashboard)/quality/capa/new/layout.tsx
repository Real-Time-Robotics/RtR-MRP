import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tạo CAPA mới',
  description: 'Tạo hành động khắc phục và phòng ngừa mới',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
