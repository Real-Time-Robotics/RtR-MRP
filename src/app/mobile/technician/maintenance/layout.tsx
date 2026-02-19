import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Maintenance',
  description: 'Mobile maintenance tasks and work orders - Nhiệm vụ bảo trì và lệnh công việc trên di động',
};

export default function MobileMaintenanceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
