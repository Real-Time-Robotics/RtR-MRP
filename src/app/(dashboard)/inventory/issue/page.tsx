import type { Metadata } from 'next';
import { IssueMaterialsPage } from '@/components/inventory/issue-materials-page';
import { SmartLayout } from '@/components/ui-v2/smart-layout';

export const metadata: Metadata = {
  title: 'Xuất vật tư',
  description: 'Xuất vật tư cho sản xuất - Quản lý và theo dõi xuất kho',
};

export default function InventoryIssuePage() {
  return (
    <SmartLayout>
      <IssueMaterialsPage />
    </SmartLayout>
  );
}
