import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function Page() {
  return (
    <div className="p-6 max-w-3xl">
      <Link href="/home" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Quay về trang chủ
      </Link>
      <h1 className="text-2xl font-semibold mb-2">GRN</h1>
      <p className="text-muted-foreground mb-6">Goods Receipt Note — phiếu nhận hàng.</p>
      <div className="rounded-lg border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Trang này sẽ được implement Sprint 28-30.
        </p>
      </div>
    </div>
  );
}
