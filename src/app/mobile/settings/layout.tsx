import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Mobile app settings and preferences - Cài đặt ứng dụng di động',
};

export default function MobileSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
