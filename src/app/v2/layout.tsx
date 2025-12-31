'use client';

import { AppShell } from '@/components/layout-v2';

export default function V2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
