'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  QrCode,
  Camera,
  AlertTriangle,
  ChevronRight,
  Check,
  Zap,
  Wrench,
  Settings,
  Thermometer,
  Droplet,
  Eye,
  Cpu,
  Send,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// NEW DOWNTIME REPORT PAGE
// 2-step wizard để báo cáo downtime
// =============================================================================

interface Equipment {
  id: string;
  code: string;
  name: string;
  location: string;
}

const mockEquipment: Equipment[] = [
  { id: '1', code: 'CNC-001', name: 'CNC Mill #1', location: 'Bay A1' },
  { id: '2', code: 'CNC-002', name: 'CNC Mill #2', location: 'Bay A2' },
  { id: '3', code: 'ROBOT-001', name: 'Welding Robot', location: 'Bay B2' },
  { id: '4', code: 'PACK-001', name: 'Packaging Line', location: 'Bay C1' },
  { id: '5', code: 'CONV-001', name: 'Conveyor Belt #1', location: 'Bay A3' },
  { id: '6', code: 'CONV-002', name: 'Conveyor Belt #2', location: 'Bay A3' },
  { id: '7', code: 'LASER-001', name: 'Laser Cutter', location: 'Bay D1' },
  { id: '8', code: 'PRESS-001', name: 'Hydraulic Press', location: 'Bay E1' },
];

const categories = [
  { id: 'electrical', label: 'Điện', icon: <Zap className="w-5 h-5" /> },
  { id: 'mechanical', label: 'Cơ khí', icon: <Wrench className="w-5 h-5" /> },
  { id: 'pneumatic', label: 'Khí nén', icon: <Settings className="w-5 h-5" /> },
  { id: 'hydraulic', label: 'Thủy lực', icon: <Droplet className="w-5 h-5" /> },
  { id: 'thermal', label: 'Nhiệt', icon: <Thermometer className="w-5 h-5" /> },
  { id: 'sensor', label: 'Cảm biến', icon: <Eye className="w-5 h-5" /> },
  { id: 'software', label: 'Phần mềm', icon: <Cpu className="w-5 h-5" /> },
  { id: 'other', label: 'Khác', icon: <AlertTriangle className="w-5 h-5" /> },
];

const severityLevels = [
  { id: 'CRITICAL', label: 'Nghiêm trọng', description: 'Máy ngừng hoàn toàn', color: 'bg-red-500' },
  { id: 'MAJOR', label: 'Lớn', description: 'Ảnh hưởng sản xuất', color: 'bg-orange-500' },
  { id: 'MINOR', label: 'Nhỏ', description: 'Vẫn hoạt động được', color: 'bg-yellow-500' },
  { id: 'OBSERVATION', label: 'Quan sát', description: 'Cần theo dõi', color: 'bg-blue-500' },
];

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );
}

export default function NewDowntimePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NewDowntimeContent />
    </Suspense>
  );
}

function NewDowntimeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedEquipment = searchParams.get('equipment');

  const [step, setStep] = useState(preselectedEquipment ? 2 : 1);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(
    preselectedEquipment ? mockEquipment.find(e => e.code === preselectedEquipment) || null : null
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleEquipmentSelect = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedEquipment || !selectedCategory || !selectedSeverity || !description) {
      return;
    }

    setSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Navigate back
    router.push('/mobile/technician/downtime');
  };

  const canSubmit = selectedEquipment && selectedCategory && selectedSeverity && description.trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => step === 1 ? router.back() : setStep(1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Báo cáo Downtime</h1>
            <p className="text-sm text-gray-500">Bước {step}/2</p>
          </div>
        </div>

        {/* Progress */}
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            <div className={cn('flex-1 h-1 rounded-full', step >= 1 ? 'bg-blue-500' : 'bg-gray-200')} />
            <div className={cn('flex-1 h-1 rounded-full', step >= 2 ? 'bg-blue-500' : 'bg-gray-200')} />
          </div>
        </div>
      </div>

      {/* Step 1: Select Equipment */}
      {step === 1 && (
        <div className="p-4">
          {/* QR Scan Button */}
          <Link
            href="/mobile/scan?returnTo=/mobile/technician/downtime/new"
            className="block w-full py-4 bg-blue-500 text-white rounded-xl mb-4 text-center font-medium flex items-center justify-center gap-2"
          >
            <QrCode className="w-5 h-5" />
            Quét mã QR thiết bị
          </Link>

          <div className="text-center text-gray-400 text-sm mb-4">─── hoặc chọn từ danh sách ───</div>

          {/* Equipment List */}
          <div className="space-y-2">
            {mockEquipment.map((equipment) => (
              <button
                key={equipment.id}
                onClick={() => handleEquipmentSelect(equipment)}
                className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 text-left flex items-center justify-between shadow-sm"
              >
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{equipment.code}</p>
                  <p className="text-sm text-gray-500">{equipment.name}</p>
                  <p className="text-xs text-gray-400">{equipment.location}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <div className="p-4 space-y-6">
          {/* Selected Equipment */}
          {selectedEquipment && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Thiết bị đã chọn</p>
              <p className="font-bold text-gray-900 dark:text-white">{selectedEquipment.code} - {selectedEquipment.name}</p>
              <p className="text-sm text-gray-500">{selectedEquipment.location}</p>
              <button
                onClick={() => setStep(1)}
                className="mt-2 text-sm text-blue-600 underline"
              >
                Đổi thiết bị
              </button>
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Loại sự cố
            </label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl transition-all',
                    selectedCategory === cat.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                  )}
                >
                  {cat.icon}
                  <span className="text-xs font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Severity Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Mức độ nghiêm trọng
            </label>
            <div className="space-y-2">
              {severityLevels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setSelectedSeverity(level.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl transition-all border-2',
                    selectedSeverity === level.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  )}
                >
                  <div className={cn('w-4 h-4 rounded-full', level.color)} />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900 dark:text-white">{level.label}</p>
                    <p className="text-xs text-gray-500">{level.description}</p>
                  </div>
                  {selectedSeverity === level.id && (
                    <Check className="w-5 h-5 text-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Mô tả sự cố
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết tình trạng sự cố..."
              rows={4}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Photo Attachment */}
          <button className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 flex items-center justify-center gap-2">
            <Camera className="w-5 h-5" />
            Đính kèm hình ảnh (tùy chọn)
          </button>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className={cn(
              'w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all',
              canSubmit && !submitting
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
          >
            {submitting ? (
              <>Đang gửi...</>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Gửi báo cáo
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
