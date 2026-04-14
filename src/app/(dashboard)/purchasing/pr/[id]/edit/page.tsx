'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PRForm, type PRFormValues } from '@/components/purchasing/pr/pr-form';

export default function EditPurchaseRequestPage() {
  const params = useParams<{ id: string }>();
  const prId = params.id;
  const [initial, setInitial] = useState<PRFormValues | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/purchasing/pr/${prId}`);
        const json = await res.json();
        if (!res.ok || !json.success) return;
        const { pr, lines } = json.data;
        setInitial({
          title: pr.title,
          description: pr.description ?? '',
          priority: pr.priority,
          requiredDate: String(pr.requiredDate).split('T')[0],
          budgetCode: pr.budgetCode ?? '',
          costCenter: pr.costCenter ?? '',
          lines: lines.map((l: any) => ({
            partId: l.part?.id ?? null,
            itemDescription: l.description ?? l.part?.name ?? '',
            itemCode: l.itemCode ?? null,
            requestedQty: Number(l.requestedQty),
            unit: l.unit,
            estimatedPrice: Number(l.estimatedPrice ?? 0),
            notes: l.notes ?? null,
          })),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [prId]);

  if (loading) return <div className="container mx-auto py-6">Loading…</div>;
  if (!initial) return <div className="container mx-auto py-6">PR not found</div>;

  return (
    <div className="container mx-auto py-6">
      <PRForm initialData={initial} prId={prId} />
    </div>
  );
}
