import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Xưởng sản xuất',
  description: 'Giám sát hoạt động xưởng sản xuất theo thời gian thực',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
