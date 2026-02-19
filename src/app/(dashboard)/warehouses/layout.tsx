import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Warehouse Management | RTR-MRP',
  description: 'Manage warehouses, storage locations, and warehouse configuration - Quản lý kho bãi, vị trí lưu trữ và cấu hình kho',
};

export default function WarehousesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
