import { IssueMaterialsPage } from '@/components/inventory/issue-materials-page';
import { SmartLayout } from '@/components/ui-v2/smart-layout';

export default function InventoryIssuePage() {
  return (
    <SmartLayout>
      <IssueMaterialsPage />
    </SmartLayout>
  );
}
