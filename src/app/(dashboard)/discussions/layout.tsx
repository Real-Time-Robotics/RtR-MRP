import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | RTR-MRP',
    default: 'Discussions | RTR-MRP',
  },
  description: 'Internal discussions, information exchange, and team collaboration - Thảo luận nội bộ, trao đổi thông tin và cộng tác nhóm',
};

export default function DiscussionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
