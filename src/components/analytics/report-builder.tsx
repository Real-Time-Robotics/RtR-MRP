'use client';

import React, { useState, useCallback } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Eye,
  Download,
  Save,
  X,
  BarChart3,
  PieChart,
  LineChart,
  Table,
  FileSpreadsheet,
  Clock,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// REPORT BUILDER
// Custom report creation interface
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

type ReportBlockType =
  | 'chart-line'
  | 'chart-bar'
  | 'chart-pie'
  | 'table'
  | 'kpi'
  | 'text'
  | 'divider';

type DataSource =
  | 'sales-orders'
  | 'inventory'
  | 'production'
  | 'quality'
  | 'purchasing'
  | 'customers'
  | 'suppliers';

interface ReportBlock {
  id: string;
  type: ReportBlockType;
  title: string;
  dataSource?: DataSource;
  config: Record<string, any>;
  width: 'full' | 'half' | 'third';
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  blocks: ReportBlock[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
  };
}

// =============================================================================
// BLOCK TYPE OPTIONS
// =============================================================================

const blockTypeOptions: { type: ReportBlockType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'chart-line', label: 'Biểu đồ đường', icon: <LineChart className="w-5 h-5" />, description: 'Xu hướng theo thời gian' },
  { type: 'chart-bar', label: 'Biểu đồ cột', icon: <BarChart3 className="w-5 h-5" />, description: 'So sánh giá trị' },
  { type: 'chart-pie', label: 'Biểu đồ tròn', icon: <PieChart className="w-5 h-5" />, description: 'Phân bổ tỷ lệ' },
  { type: 'table', label: 'Bảng dữ liệu', icon: <Table className="w-5 h-5" />, description: 'Chi tiết dạng bảng' },
  { type: 'kpi', label: 'KPI Card', icon: <FileSpreadsheet className="w-5 h-5" />, description: 'Chỉ số chính' },
  { type: 'text', label: 'Văn bản', icon: <FileText className="w-5 h-5" />, description: 'Ghi chú, mô tả' },
];

const dataSourceOptions: { value: DataSource; label: string }[] = [
  { value: 'sales-orders', label: 'Đơn hàng bán' },
  { value: 'inventory', label: 'Tồn kho' },
  { value: 'production', label: 'Sản xuất' },
  { value: 'quality', label: 'Chất lượng' },
  { value: 'purchasing', label: 'Mua hàng' },
  { value: 'customers', label: 'Khách hàng' },
  { value: 'suppliers', label: 'Nhà cung cấp' },
];

// =============================================================================
// REPORT TEMPLATES
// =============================================================================

const reportTemplates: Omit<ReportTemplate, 'id'>[] = [
  {
    name: 'Báo cáo doanh thu',
    description: 'Tổng quan doanh thu, đơn hàng và xu hướng',
    blocks: [
      { id: '1', type: 'kpi', title: 'Tổng doanh thu', dataSource: 'sales-orders', config: { metric: 'revenue' }, width: 'third' },
      { id: '2', type: 'kpi', title: 'Số đơn hàng', dataSource: 'sales-orders', config: { metric: 'count' }, width: 'third' },
      { id: '3', type: 'kpi', title: 'Giá trị TB', dataSource: 'sales-orders', config: { metric: 'average' }, width: 'third' },
      { id: '4', type: 'chart-line', title: 'Xu hướng doanh thu', dataSource: 'sales-orders', config: {}, width: 'full' },
      { id: '5', type: 'chart-pie', title: 'Phân bổ theo khách hàng', dataSource: 'sales-orders', config: {}, width: 'half' },
      { id: '6', type: 'table', title: 'Top đơn hàng', dataSource: 'sales-orders', config: { limit: 10 }, width: 'half' },
    ],
  },
  {
    name: 'Báo cáo tồn kho',
    description: 'Tình trạng tồn kho và cảnh báo',
    blocks: [
      { id: '1', type: 'kpi', title: 'Tổng giá trị', dataSource: 'inventory', config: { metric: 'value' }, width: 'third' },
      { id: '2', type: 'kpi', title: 'Sắp hết hàng', dataSource: 'inventory', config: { metric: 'lowStock' }, width: 'third' },
      { id: '3', type: 'kpi', title: 'Hết hàng', dataSource: 'inventory', config: { metric: 'outOfStock' }, width: 'third' },
      { id: '4', type: 'chart-pie', title: 'Phân bổ theo danh mục', dataSource: 'inventory', config: {}, width: 'half' },
      { id: '5', type: 'chart-bar', title: 'Top vật tư tồn kho', dataSource: 'inventory', config: {}, width: 'half' },
      { id: '6', type: 'table', title: 'Danh sách cảnh báo', dataSource: 'inventory', config: { filter: 'alerts' }, width: 'full' },
    ],
  },
  {
    name: 'Báo cáo sản xuất',
    description: 'Hiệu suất và tiến độ sản xuất',
    blocks: [
      { id: '1', type: 'kpi', title: 'Hiệu suất TB', dataSource: 'production', config: { metric: 'efficiency' }, width: 'third' },
      { id: '2', type: 'kpi', title: 'Lệnh hoàn thành', dataSource: 'production', config: { metric: 'completed' }, width: 'third' },
      { id: '3', type: 'kpi', title: 'Đang thực hiện', dataSource: 'production', config: { metric: 'inProgress' }, width: 'third' },
      { id: '4', type: 'chart-bar', title: 'Hiệu suất theo Line', dataSource: 'production', config: {}, width: 'half' },
      { id: '5', type: 'chart-line', title: 'Xu hướng output', dataSource: 'production', config: {}, width: 'half' },
    ],
  },
];

// =============================================================================
// BLOCK CARD COMPONENT
// =============================================================================

interface BlockCardProps {
  block: ReportBlock;
  onUpdate: (block: ReportBlock) => void;
  onRemove: () => void;
  onDragStart?: () => void;
}

function BlockCard({ block, onUpdate, onRemove, onDragStart }: BlockCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const blockType = blockTypeOptions.find(b => b.type === block.type);

  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden',
      block.width === 'full' && 'col-span-2',
      block.width === 'third' && 'col-span-1'
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
        <button
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab"
          onMouseDown={onDragStart}
          aria-label="Kéo để sắp xếp"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600">
          {blockType?.icon}
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={block.title}
            onChange={(e) => onUpdate({ ...block, title: e.target.value })}
            aria-label="Tiêu đề khối"
            className="w-full bg-transparent text-sm font-medium text-gray-900 dark:text-white border-none focus:ring-0 p-0"
          />
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-600"
          aria-label="Xóa"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Preview */}
      <div className="p-4">
        <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-400">
            {blockType?.icon}
            <p className="text-xs mt-1">{blockType?.label}</p>
          </div>
        </div>
      </div>

      {/* Config Panel */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
          {/* Data Source */}
          {block.type !== 'text' && block.type !== 'divider' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Nguồn dữ liệu
              </label>
              <select
                value={block.dataSource || ''}
                onChange={(e) => onUpdate({ ...block, dataSource: e.target.value as DataSource })}
                aria-label="Nguồn dữ liệu"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
              >
                <option value="">Chọn nguồn...</option>
                {dataSourceOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Width */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Chiều rộng
            </label>
            <div className="flex gap-2">
              {(['third', 'half', 'full'] as const).map(w => (
                <button
                  key={w}
                  onClick={() => onUpdate({ ...block, width: w })}
                  className={cn(
                    'flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    block.width === w
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  )}
                >
                  {w === 'third' ? '1/3' : w === 'half' ? '1/2' : 'Full'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ADD BLOCK MODAL
// =============================================================================

interface AddBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (type: ReportBlockType) => void;
}

function AddBlockModal({ isOpen, onClose, onAdd }: AddBlockModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" role="presentation" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Thêm block</h3>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Đóng">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {blockTypeOptions.map((option) => (
              <button
                key={option.type}
                onClick={() => {
                  onAdd(option.type);
                  onClose();
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
              >
                <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  {option.icon}
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm text-gray-900 dark:text-white">{option.label}</p>
                  <p className="text-xs text-gray-500">{option.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// =============================================================================
// SCHEDULE CONFIG
// =============================================================================

interface ScheduleConfigProps {
  schedule?: ReportTemplate['schedule'];
  onChange: (schedule: ReportTemplate['schedule']) => void;
}

function ScheduleConfig({ schedule, onChange }: ScheduleConfigProps) {
  const [isEnabled, setIsEnabled] = useState(!!schedule);

  const handleToggle = () => {
    if (isEnabled) {
      onChange(undefined);
    } else {
      onChange({
        frequency: 'weekly',
        time: '08:00',
        recipients: [],
      });
    }
    setIsEnabled(!isEnabled);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-purple-600" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Lịch gửi báo cáo</h3>
            <p className="text-sm text-gray-500">Tự động gửi báo cáo theo lịch</p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          className={cn(
            'relative w-12 h-6 rounded-full transition-colors',
            isEnabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
          )}
        >
          <span className={cn(
            'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
            isEnabled ? 'translate-x-7' : 'translate-x-1'
          )} />
        </button>
      </div>

      {isEnabled && schedule && (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tần suất
              </label>
              <select
                value={schedule.frequency}
                onChange={(e) => onChange({ ...schedule, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' })}
                aria-label="Tần suất"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm"
              >
                <option value="daily">Hàng ngày</option>
                <option value="weekly">Hàng tuần</option>
                <option value="monthly">Hàng tháng</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Thời gian
              </label>
              <input
                type="time"
                value={schedule.time}
                onChange={(e) => onChange({ ...schedule, time: e.target.value })}
                aria-label="Thời gian"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Người nhận (email)
            </label>
            <input
              type="text"
              value={schedule.recipients.join(', ')}
              onChange={(e) => onChange({ ...schedule, recipients: e.target.value.split(',').map(s => s.trim()) })}
              placeholder="email1@company.com, email2@company.com"
              aria-label="Người nhận email"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ReportBuilder() {
  const [reportName, setReportName] = useState('Báo cáo mới');
  const [blocks, setBlocks] = useState<ReportBlock[]>([]);
  const [schedule, setSchedule] = useState<ReportTemplate['schedule']>();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);

  const addBlock = useCallback((type: ReportBlockType) => {
    const newBlock: ReportBlock = {
      id: `block-${Date.now()}`,
      type,
      title: blockTypeOptions.find(b => b.type === type)?.label || 'Block mới',
      config: {},
      width: type === 'kpi' ? 'third' : 'half',
    };
    setBlocks(prev => [...prev, newBlock]);
    setShowTemplates(false);
  }, []);

  const updateBlock = useCallback((updatedBlock: ReportBlock) => {
    setBlocks(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b));
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  }, []);

  const loadTemplate = useCallback((template: Omit<ReportTemplate, 'id'>) => {
    setReportName(template.name);
    setBlocks(template.blocks.map(b => ({ ...b, id: `block-${Date.now()}-${Math.random()}` })));
    setSchedule(template.schedule);
    setShowTemplates(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <FileText className="w-6 h-6 text-purple-600" />
            <input
              type="text"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              aria-label="Tên báo cáo"
              className="text-xl font-bold text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 p-0"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <Eye className="w-4 h-4" />
              Xem trước
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <Download className="w-4 h-4" />
              Xuất
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors">
              <Save className="w-4 h-4" />
              Lưu báo cáo
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Templates (shown when empty) */}
        {showTemplates && blocks.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Chọn mẫu báo cáo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {reportTemplates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => loadTemplate(template)}
                  className="p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                >
                  <h4 className="font-medium text-gray-900 dark:text-white">{template.name}</h4>
                  <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                  <p className="text-xs text-purple-600 mt-2">{template.blocks.length} blocks</p>
                </button>
              ))}
              <button
                onClick={() => setShowTemplates(false)}
                className="p-4 text-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
              >
                <Plus className="w-8 h-8 mx-auto text-gray-400" />
                <p className="text-sm text-gray-500 mt-2">Tạo từ đầu</p>
              </button>
            </div>
          </div>
        )}

        {/* Blocks Grid */}
        {!showTemplates && (
          <>
            <div className="grid grid-cols-2 gap-4">
              {blocks.map((block) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  onUpdate={updateBlock}
                  onRemove={() => removeBlock(block.id)}
                />
              ))}

              {/* Add Block Button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="col-span-1 h-48 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
              >
                <Plus className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-500">Thêm block</span>
              </button>
            </div>

            {/* Schedule Config */}
            <ScheduleConfig schedule={schedule} onChange={setSchedule} />
          </>
        )}
      </div>

      {/* Add Block Modal */}
      <AddBlockModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addBlock}
      />
    </div>
  );
}

export default ReportBuilder;
