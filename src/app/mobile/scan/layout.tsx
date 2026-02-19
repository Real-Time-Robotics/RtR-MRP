import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Barcode Scanner',
  description: 'Scan barcodes and QR codes for inventory operations - Quét mã vạch và QR cho thao tác kho',
};

export default function MobileScanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
