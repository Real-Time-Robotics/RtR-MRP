import type { Metadata } from 'next';
import MRPPlanningPage from '@/components/mrp/mrp-planning';

export const metadata: Metadata = {
  title: 'Kế hoạch MRP',
  description: 'Hoạch định nhu cầu vật tư - Lập kế hoạch sản xuất và mua hàng',
};

export default function MRPPlanningRoute() {
  return <MRPPlanningPage />;
}
