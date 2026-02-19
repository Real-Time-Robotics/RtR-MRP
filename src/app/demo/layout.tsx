import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Demo',
  description: 'Trải nghiệm demo hệ thống RTR MRP',
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
