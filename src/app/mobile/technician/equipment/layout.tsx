import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Equipment',
  description: 'Mobile equipment list and status monitoring - Danh sách thiết bị và theo dõi trạng thái trên di động',
};

export default function MobileEquipmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
