import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CAPA',
  description: 'Hành động khắc phục và phòng ngừa (CAPA)',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
