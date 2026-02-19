import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | RTR MRP',
    default: 'Quản lý vật tư',
  },
  description: 'Quản lý danh mục vật tư, linh kiện và nguyên vật liệu',
};

export default function PartsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
