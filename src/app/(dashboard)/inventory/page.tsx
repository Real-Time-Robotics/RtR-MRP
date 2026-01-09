import { InventoryTable } from '@/components/inventory/inventory-table';
import { SmartLayout } from '@/components/ui-v2/smart-layout';

export default function InventoryPage() {
  return (
    <SmartLayout>
      <InventoryTable />
    </SmartLayout>
  );
}
