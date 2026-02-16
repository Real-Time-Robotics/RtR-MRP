import { OrdersTable } from '@/components/orders/orders-table';
import { SmartLayout } from '@/components/ui-v2/smart-layout';

export default function OrdersPage() {
  return (
    <SmartLayout>
      <OrdersTable />
    </SmartLayout>
  );
}
