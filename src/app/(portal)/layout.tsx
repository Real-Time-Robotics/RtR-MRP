import type { Metadata } from 'next';
import { PortalLayoutClient } from './portal-layout-client';

export const metadata: Metadata = {
  title: {
    template: '%s | RTR MRP',
    default: 'Cổng khách hàng',
  },
  description: 'Cổng thông tin khách hàng và nhà cung cấp RTR MRP',
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalLayoutClient>{children}</PortalLayoutClient>;
}
