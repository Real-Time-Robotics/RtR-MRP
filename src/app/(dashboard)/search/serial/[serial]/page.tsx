// /dashboard/search/serial/:serial — Deep link server component (TIP-S27-08)

import { SerialDetailCard, type SerialResponse } from '@/components/serial/serial-detail-card';
import Link from 'next/link';

async function fetchSerial(serial: string): Promise<SerialResponse | null> {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/api/serial/${encodeURIComponent(serial)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function SerialDeepLinkPage({
  params,
}: {
  params: Promise<{ serial: string }>;
}) {
  const { serial } = await params;
  const data = await fetchSerial(serial);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4">
        <Link
          href="/search/serial"
          className="text-sm text-info-cyan hover:underline"
        >
          ← Quay lại tra cứu
        </Link>
      </div>

      {data ? (
        <SerialDetailCard serial={data} />
      ) : (
        <div className="border border-red-200 bg-red-50 dark:bg-red-900/10 rounded-lg p-6 text-center">
          <h2 className="text-lg font-bold mb-1">Không tìm thấy</h2>
          <p className="text-sm text-muted-foreground">
            Serial <span className="font-mono font-bold">{serial}</span> không tồn tại trong hệ thống.
          </p>
        </div>
      )}
    </div>
  );
}
