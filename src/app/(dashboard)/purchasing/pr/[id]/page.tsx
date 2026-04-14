import { PRDetail } from '@/components/purchasing/pr';

export default function PurchaseRequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="container mx-auto py-6">
      <PRDetail prId={params.id} />
    </div>
  );
}
