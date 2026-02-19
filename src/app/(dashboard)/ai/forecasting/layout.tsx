import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dự báo nhu cầu',
  description: 'Dự báo nhu cầu nguyên vật liệu với machine learning',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
