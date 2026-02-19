'use client';

import { useState, useEffect } from 'react';
import {
  Wrench,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  ThermometerSun,
  Gauge,
  Zap,
  RefreshCw,
  ChevronRight,
  Calendar,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// PREDICTIVE MAINTENANCE PAGE
// Equipment health monitoring and failure prediction
// =============================================================================

interface EquipmentSummary {
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  healthScore: number;
  status: 'HEALTHY' | 'DEGRADED' | 'AT_RISK' | 'CRITICAL';
  failureProbability: number;
  daysUntilMaintenance: number;
  hasRecommendations: boolean;
  criticalRecommendations: number;
}

interface SensorReading {
  sensorId: string;
  sensorName: string;
  value: number;
  unit: string;
  normalRange: { min: number; max: number };
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  lastUpdated: string;
}

interface RiskFactor {
  factor: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  contribution: number;
  description: string;
}

interface MaintenanceEvent {
  id: string;
  type: 'PM' | 'CM' | 'INSPECTION';
  date: string;
  description: string;
  downtime: number;
  cost: number;
}

interface EquipmentDetail {
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  healthScore: number;
  status: 'HEALTHY' | 'DEGRADED' | 'AT_RISK' | 'CRITICAL';
  failureProbability: number;
  predictedFailureDate?: string;
  daysUntilMaintenance: number;
  riskFactors: RiskFactor[];
  recommendations: {
    type: string;
    priority: string;
    title: string;
    description: string;
    estimatedDowntime?: number;
    scheduleBefore?: string;
  }[];
  sensorData: SensorReading[];
  maintenanceHistory: MaintenanceEvent[];
  operatingHours: number;
  expectedLifeHours: number;
  lastMaintenanceDate: string;
  nextScheduledMaintenance: string;
}

const STATUS_CONFIG = {
  HEALTHY: { color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Healthy' },
  DEGRADED: { color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Degraded' },
  AT_RISK: { color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30', label: 'At Risk' },
  CRITICAL: { color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Critical' },
};

const SENSOR_ICONS: Record<string, React.ReactNode> = {
  'Temperature': <ThermometerSun className="w-4 h-4" />,
  'Vibration': <Activity className="w-4 h-4" />,
  'Pressure': <Gauge className="w-4 h-4" />,
  'Current': <Zap className="w-4 h-4" />,
};

export default function PredictiveMaintenancePage() {
  const [equipment, setEquipment] = useState<EquipmentSummary[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchEquipment();
  }, []);

  async function fetchEquipment() {
    setLoading(true);
    try {
      const res = await fetch('/api/v2/ai?view=maintenance');
      const json = await res.json();
      if (json.success) {
        setEquipment(json.data.equipment);
        if (json.data.equipment.length > 0) {
          fetchEquipmentDetail(json.data.equipment[0].equipmentId);
        }
      }
    } catch (error) {
      clientLogger.error('Error fetching equipment:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEquipmentDetail(equipmentId: string) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/v2/ai?view=maintenance&equipmentId=${equipmentId}`);
      const json = await res.json();
      if (json.success) {
        setSelectedEquipment(json.data);
      }
    } catch (error) {
      clientLogger.error('Error fetching equipment detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  }

  // Summary stats
  const statusCounts = {
    HEALTHY: equipment.filter(e => e.status === 'HEALTHY').length,
    DEGRADED: equipment.filter(e => e.status === 'DEGRADED').length,
    AT_RISK: equipment.filter(e => e.status === 'AT_RISK').length,
    CRITICAL: equipment.filter(e => e.status === 'CRITICAL').length,
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-600">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Predictive Maintenance</h1>
            <p className="text-gray-500 dark:text-gray-400">Bảo trì dự đoán dựa trên AI/ML</p>
          </div>
        </div>
        <button
          onClick={fetchEquipment}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <div key={status} className={cn('rounded-xl p-4 border', config.bg, 'border-transparent')}>
            <div className="flex items-center justify-between">
              <Shield className={cn('w-6 h-6', config.color)} />
              <span className={cn('text-2xl font-bold', config.color)}>
                {statusCounts[status as keyof typeof statusCounts]}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{config.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equipment List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Equipment ({equipment.length})</h3>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {equipment.map((eq) => {
              const statusConfig = STATUS_CONFIG[eq.status];
              return (
                <button
                  key={eq.equipmentId}
                  onClick={() => fetchEquipmentDetail(eq.equipmentId)}
                  className={cn(
                    'w-full p-4 text-left border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                    selectedEquipment?.equipmentId === eq.equipmentId && 'bg-orange-50 dark:bg-orange-900/20'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{eq.equipmentCode}</p>
                      <p className="text-sm text-gray-500 truncate">{eq.equipmentName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {eq.criticalRecommendations > 0 && (
                        <span className="w-2 h-2 bg-red-500 rounded-full" />
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', statusConfig.bg, statusConfig.color)}>
                      {statusConfig.label}
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="w-16 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            eq.healthScore >= 80 ? 'bg-green-500' :
                            eq.healthScore >= 60 ? 'bg-yellow-500' :
                            eq.healthScore >= 30 ? 'bg-orange-500' : 'bg-red-500'
                          )}
                          style={{ width: `${eq.healthScore}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8">{eq.healthScore}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Equipment Detail */}
        <div className="lg:col-span-2 space-y-6">
          {loadingDetail ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <RefreshCw className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading equipment data...</p>
            </div>
          ) : selectedEquipment ? (
            <>
              {/* Health Overview */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedEquipment.equipmentCode}</h2>
                    <p className="text-gray-500">{selectedEquipment.equipmentName}</p>
                  </div>
                  <span className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium',
                    STATUS_CONFIG[selectedEquipment.status].bg,
                    STATUS_CONFIG[selectedEquipment.status].color
                  )}>
                    {STATUS_CONFIG[selectedEquipment.status].label}
                  </span>
                </div>

                {/* Health Score Gauge */}
                <div className="flex items-center gap-8">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="none" className="text-gray-100 dark:text-gray-700" />
                      <circle
                        cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="none"
                        strokeDasharray={`${selectedEquipment.healthScore * 3.52} 352`}
                        className={cn(
                          selectedEquipment.healthScore >= 80 ? 'text-green-500' :
                          selectedEquipment.healthScore >= 60 ? 'text-yellow-500' :
                          selectedEquipment.healthScore >= 30 ? 'text-orange-500' : 'text-red-500'
                        )}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">{selectedEquipment.healthScore}</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Failure Probability</span>
                      <span className={cn(
                        'font-bold',
                        selectedEquipment.failureProbability > 50 ? 'text-red-500' :
                        selectedEquipment.failureProbability > 25 ? 'text-orange-500' : 'text-green-500'
                      )}>
                        {selectedEquipment.failureProbability}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Operating Hours</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {selectedEquipment.operatingHours.toLocaleString()} / {selectedEquipment.expectedLifeHours.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Days Until Maintenance</span>
                      <span className={cn(
                        'font-medium',
                        selectedEquipment.daysUntilMaintenance <= 0 ? 'text-red-500' :
                        selectedEquipment.daysUntilMaintenance <= 7 ? 'text-orange-500' : 'text-green-500'
                      )}>
                        {selectedEquipment.daysUntilMaintenance <= 0 ? 'Overdue' : `${selectedEquipment.daysUntilMaintenance} days`}
                      </span>
                    </div>
                    {selectedEquipment.predictedFailureDate && (
                      <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <span className="text-sm text-red-600 dark:text-red-400">Predicted Failure</span>
                        <span className="text-red-600 dark:text-red-400 font-bold">
                          {selectedEquipment.predictedFailureDate}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sensor Readings */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Sensor Readings
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {selectedEquipment.sensorData.map((sensor) => (
                    <div
                      key={sensor.sensorId}
                      className={cn(
                        'p-4 rounded-xl border',
                        sensor.status === 'CRITICAL' ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20' :
                        sensor.status === 'WARNING' ? 'border-yellow-300 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20' :
                        'border-gray-200 dark:border-gray-700'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {SENSOR_ICONS[sensor.sensorName] || <Gauge className="w-4 h-4" />}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{sensor.sensorName}</span>
                        </div>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          sensor.status === 'CRITICAL' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                          sensor.status === 'WARNING' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' :
                          'bg-green-100 dark:bg-green-900/30 text-green-600'
                        )}>
                          {sensor.status}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {sensor.value} <span className="text-sm font-normal text-gray-500">{sensor.unit}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Normal: {sensor.normalRange.min} - {sensor.normalRange.max} {sensor.unit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Factors & Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Risk Factors */}
                {selectedEquipment.riskFactors.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      Risk Factors
                    </h3>
                    <div className="space-y-3">
                      {selectedEquipment.riskFactors.map((rf, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className={cn(
                            'w-2 h-2 mt-2 rounded-full',
                            rf.severity === 'CRITICAL' ? 'bg-red-500' :
                            rf.severity === 'HIGH' ? 'bg-orange-500' :
                            rf.severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-gray-400'
                          )} />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{rf.factor}</p>
                            <p className="text-xs text-gray-500">{rf.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {selectedEquipment.recommendations.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      Recommendations
                    </h3>
                    <div className="space-y-3">
                      {selectedEquipment.recommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'p-3 rounded-lg border',
                            rec.priority === 'CRITICAL' ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' :
                            rec.priority === 'HIGH' ? 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20' :
                            'border-gray-200 dark:border-gray-700'
                          )}
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{rec.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{rec.description}</p>
                          {rec.scheduleBefore && (
                            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Before: {rec.scheduleBefore}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Maintenance History */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-500" />
                  Maintenance History
                </h3>
                <div className="space-y-3">
                  {selectedEquipment.maintenanceHistory.slice(0, 5).map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          event.type === 'PM' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                          event.type === 'CM' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-600'
                        )}>
                          {event.type}
                        </span>
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">{event.description}</p>
                          <p className="text-xs text-gray-500">{event.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-900 dark:text-white">{event.downtime}h</p>
                        <p className="text-xs text-gray-500">{(event.cost / 1000000).toFixed(1)}M VND</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Chọn thiết bị để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
