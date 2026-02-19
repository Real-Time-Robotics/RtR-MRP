import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Customer support tickets and communication - Yêu cầu hỗ trợ và liên lạc khách hàng',
};

export default function CustomerSupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
