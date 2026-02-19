import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Report Downtime',
  description: 'Report new equipment downtime event - Báo cáo sự kiện ngừng máy mới',
};

export default function MobileNewDowntimeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
