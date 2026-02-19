'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Target,
  Award,
  Star,
  Package,
  Truck,
  Shield,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// SUPPLIER PERFORMANCE PAGE
// View performance metrics and KPIs
// =============================================================================

interface PerformanceData {
  period: string;
  metrics: {
    onTimeDelivery: number;
    qualityRate: number;
    responseTime: number;
    orderFulfillment: number;
    defectRate: number;
  };
  trend: {
    onTimeDelivery: 'up' | 'down' | 'stable';
    qualityRate: 'up' | 'down' | 'stable';
    responseTime: 'up' | 'down' | 'stable';
    orderFulfillment: 'up' | 'down' | 'stable';
    defectRate: 'up' | 'down' | 'stable';
  };
  ranking: {
    overall: string;
    category: number;
    total: number;
  };
}

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  target: number;
  trend: 'up' | 'down' | 'stable';
  trendIsGood: boolean;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const RATING_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'A': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-500' },
  'B': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500' },
  'C': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-500' },
  'D': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-500' },
};

// Historical data for chart
const HISTORICAL_DATA = [
  { month: 'T7', onTimeDelivery: 91, qualityRate: 96, orderFulfillment: 93 },
  { month: 'T8', onTimeDelivery: 92, qualityRate: 97, orderFulfillment: 94 },
  { month: 'T9', onTimeDelivery: 90, qualityRate: 97, orderFulfillment: 95 },
  { month: 'T10', onTimeDelivery: 93, qualityRate: 98, orderFulfillment: 96 },
  { month: 'T11', onTimeDelivery: 94, qualityRate: 98, orderFulfillment: 96 },
  { month: 'T12', onTimeDelivery: 94.5, qualityRate: 98.2, orderFulfillment: 96.8 },
];

function TrendIcon({ trend, isGood }: { trend: 'up' | 'down' | 'stable'; isGood: boolean }) {
  if (trend === 'stable') {
    return <Minus className="w-4 h-4 text-gray-400" />;
  }

  const isPositive = (trend === 'up' && isGood) || (trend === 'down' && !isGood);

  if (trend === 'up') {
    return <TrendingUp className={cn('w-4 h-4', isPositive ? 'text-green-500' : 'text-red-500')} />;
  }

  return <TrendingDown className={cn('w-4 h-4', isPositive ? 'text-green-500' : 'text-red-500')} />;
}

function MetricCard({ title, value, unit, target, trend, trendIsGood, icon, color, description }: MetricCardProps) {
  const percentage = Math.min((value / target) * 100, 100);
  const isOnTarget = value >= target;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-2 rounded-lg', `bg-${color}-100 dark:bg-${color}-900/30`)}>
          {icon}
        </div>
        <div className="flex items-center gap-1">
          <TrendIcon trend={trend} isGood={trendIsGood} />
          <span className={cn(
            'text-xs font-medium',
            trend === 'stable' ? 'text-gray-400' :
              ((trend === 'up' && trendIsGood) || (trend === 'down' && !trendIsGood))
                ? 'text-green-500' : 'text-red-500'
          )}>
            {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}
            {trend !== 'stable' && '2.5%'}
          </span>
        </div>
      </div>

      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</h3>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
        <span className="text-sm text-gray-500">{unit}</span>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">Mục tiêu: {target}{unit}</span>
          <span className={isOnTarget ? 'text-green-500' : 'text-amber-500'}>
            {isOnTarget ? 'Đạt' : 'Chưa đạt'}
          </span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              isOnTarget ? 'bg-green-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-red-500'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

export default function SupplierPerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('Q4 2025');

  useEffect(() => {
    fetchPerformance();
  }, []);

  async function fetchPerformance() {
    setLoading(true);
    try {
      const res = await fetch('/api/v2/supplier?view=performance');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      clientLogger.error('Error fetching performance', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không thể tải dữ liệu</p>
      </div>
    );
  }

  const ratingColors = RATING_COLORS[data.ranking.overall] || RATING_COLORS['C'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hiệu suất</h1>
          <p className="text-gray-500 dark:text-gray-400">Theo dõi và cải thiện các chỉ số KPI</p>
        </div>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          aria-label="Chọn kỳ"
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="Q4 2025">Q4 2025</option>
          <option value="Q3 2025">Q3 2025</option>
          <option value="Q2 2025">Q2 2025</option>
          <option value="Q1 2025">Q1 2025</option>
        </select>
      </div>

      {/* Overall Rating Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className={cn(
              'w-24 h-24 rounded-2xl flex items-center justify-center bg-white/20 backdrop-blur',
              'border-4', ratingColors.border
            )}>
              <span className="text-5xl font-bold">{data.ranking.overall}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">Xếp hạng tổng thể</h2>
              <p className="text-blue-100">
                Hạng {data.ranking.category}/{data.ranking.total} trong danh mục nhà cung cấp
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Award className="w-5 h-5 text-yellow-300" />
                <span className="text-sm">Top 10% nhà cung cấp ưu tiên</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{data.metrics.onTimeDelivery}%</div>
              <div className="text-sm text-blue-100">Đúng hạn</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{data.metrics.qualityRate}%</div>
              <div className="text-sm text-blue-100">Chất lượng</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{data.metrics.orderFulfillment}%</div>
              <div className="text-sm text-blue-100">Hoàn thành</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Giao hàng đúng hạn"
          value={data.metrics.onTimeDelivery}
          unit="%"
          target={95}
          trend={data.trend.onTimeDelivery}
          trendIsGood={true}
          icon={<Truck className="w-5 h-5 text-blue-600" />}
          color="blue"
          description="Tỷ lệ đơn hàng giao đúng hoặc trước hạn"
        />

        <MetricCard
          title="Tỷ lệ chất lượng"
          value={data.metrics.qualityRate}
          unit="%"
          target={98}
          trend={data.trend.qualityRate}
          trendIsGood={true}
          icon={<Shield className="w-5 h-5 text-green-600" />}
          color="green"
          description="Tỷ lệ sản phẩm đạt tiêu chuẩn chất lượng"
        />

        <MetricCard
          title="Thời gian phản hồi"
          value={data.metrics.responseTime}
          unit=" giờ"
          target={4}
          trend={data.trend.responseTime}
          trendIsGood={false}
          icon={<Zap className="w-5 h-5 text-amber-600" />}
          color="amber"
          description="Thời gian trung bình phản hồi đơn hàng mới"
        />

        <MetricCard
          title="Hoàn thành đơn hàng"
          value={data.metrics.orderFulfillment}
          unit="%"
          target={95}
          trend={data.trend.orderFulfillment}
          trendIsGood={true}
          icon={<Package className="w-5 h-5 text-purple-600" />}
          color="purple"
          description="Tỷ lệ đơn hàng hoàn thành đủ số lượng"
        />

        <MetricCard
          title="Tỷ lệ lỗi"
          value={data.metrics.defectRate}
          unit="%"
          target={2}
          trend={data.trend.defectRate}
          trendIsGood={false}
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
          color="red"
          description="Tỷ lệ sản phẩm lỗi hoặc không đạt yêu cầu"
        />

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Mục tiêu Q1 2026</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Giao hàng đúng hạn</span>
              <span className="font-medium text-gray-900 dark:text-white">≥ 96%</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Tỷ lệ chất lượng</span>
              <span className="font-medium text-gray-900 dark:text-white">≥ 99%</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Thời gian phản hồi</span>
              <span className="font-medium text-gray-900 dark:text-white">≤ 3 giờ</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Tỷ lệ lỗi</span>
              <span className="font-medium text-gray-900 dark:text-white">≤ 1.5%</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-6">Xu hướng 6 tháng gần nhất</h3>

        {/* Simple bar chart visualization */}
        <div className="space-y-6">
          {/* Chart Legend */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">Giao hàng đúng hạn</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-gray-600 dark:text-gray-400">Tỷ lệ chất lượng</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-purple-500" />
              <span className="text-gray-600 dark:text-gray-400">Hoàn thành đơn hàng</span>
            </div>
          </div>

          {/* Chart Bars */}
          <div className="flex items-end justify-between gap-2 h-48">
            {HISTORICAL_DATA.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center gap-1 h-40">
                  <div
                    className="w-3 bg-blue-500 rounded-t transition-all"
                    style={{ height: `${item.onTimeDelivery * 0.4}%` }}
                    title={`Đúng hạn: ${item.onTimeDelivery}%`}
                  />
                  <div
                    className="w-3 bg-green-500 rounded-t transition-all"
                    style={{ height: `${item.qualityRate * 0.4}%` }}
                    title={`Chất lượng: ${item.qualityRate}%`}
                  />
                  <div
                    className="w-3 bg-purple-500 rounded-t transition-all"
                    style={{ height: `${item.orderFulfillment * 0.4}%` }}
                    title={`Hoàn thành: ${item.orderFulfillment}%`}
                  />
                </div>
                <span className="text-xs text-gray-500">{item.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Đề xuất cải thiện</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Thời gian phản hồi</h4>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Giảm thời gian xác nhận đơn hàng xuống dưới 4 giờ để đạt mục tiêu.
              Cân nhắc thiết lập thông báo tự động khi có đơn hàng mới.
            </p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-green-900 dark:text-green-100">Duy trì chất lượng</h4>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              Tỷ lệ chất lượng đang rất tốt. Tiếp tục duy trì quy trình kiểm tra
              hiện tại và cập nhật hệ thống QC định kỳ.
            </p>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-5 h-5 text-amber-600" />
              <h4 className="font-medium text-amber-900 dark:text-amber-100">Tăng tỷ lệ đúng hạn</h4>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Cần tăng thêm 0.5% để đạt mục tiêu 95%. Xem xét lại lịch trình vận chuyển
              và dự phòng thời gian cho các đơn hàng lớn.
            </p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-purple-600" />
              <h4 className="font-medium text-purple-900 dark:text-purple-100">Mục tiêu xếp hạng A+</h4>
            </div>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Chỉ cần cải thiện nhẹ các chỉ số để đạt xếp hạng A+.
              Điều này sẽ mở ra cơ hội ưu tiên cho các đơn hàng lớn hơn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
