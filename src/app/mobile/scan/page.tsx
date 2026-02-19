'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  MapPin, 
  ClipboardList,
  FileText,
  ShoppingCart,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  History,
  X,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';
import { BarcodeScanner } from '@/components/mobile/barcode-scanner';

// =============================================================================
// MOBILE SCAN PAGE
// =============================================================================

interface ScanResult {
  type: 'PART' | 'LOCATION' | 'WORK_ORDER' | 'PURCHASE_ORDER' | 'SALES_ORDER' | 'UNKNOWN';
  value: string;
  resolved: boolean;
  entity: Record<string, any> | null;
  actions: string[];
}

export default function MobileScanPage() {
  const router = useRouter();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentScans, setRecentScans] = useState<{ code: string; type: string; time: Date }[]>([]);

  // Process scan
  const handleScan = async (barcode: string) => {
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/mobile/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode, context: 'general' }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setScanResult({
          type: data.scan.type,
          value: data.scan.value,
          resolved: data.resolved,
          entity: data.entity,
          actions: data.actions,
        });
        
        // Add to recent scans
        setRecentScans(prev => [
          { code: barcode, type: data.scan.type, time: new Date() },
          ...prev.slice(0, 9)
        ]);
      } else {
        setScanResult({
          type: 'UNKNOWN',
          value: barcode,
          resolved: false,
          entity: null,
          actions: ['manual_lookup'],
        });
      }
    } catch (error) {
      clientLogger.error('Scan error', error);
      setScanResult({
        type: 'UNKNOWN',
        value: barcode,
        resolved: false,
        entity: null,
        actions: ['manual_lookup'],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Get icon for entity type
  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      PART: <Package className="w-6 h-6" />,
      LOCATION: <MapPin className="w-6 h-6" />,
      WORK_ORDER: <ClipboardList className="w-6 h-6" />,
      PURCHASE_ORDER: <FileText className="w-6 h-6" />,
      SALES_ORDER: <ShoppingCart className="w-6 h-6" />,
      UNKNOWN: <AlertTriangle className="w-6 h-6" />,
    };
    return icons[type] || icons.UNKNOWN;
  };

  // Get color for entity type
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      PART: 'bg-blue-500',
      LOCATION: 'bg-green-500',
      WORK_ORDER: 'bg-purple-500',
      PURCHASE_ORDER: 'bg-orange-500',
      SALES_ORDER: 'bg-cyan-500',
      UNKNOWN: 'bg-gray-500',
    };
    return colors[type] || colors.UNKNOWN;
  };

  // Get type label
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PART: 'Vật tư',
      LOCATION: 'Vị trí',
      WORK_ORDER: 'Lệnh SX',
      PURCHASE_ORDER: 'Đơn mua',
      SALES_ORDER: 'Đơn bán',
      UNKNOWN: 'Không xác định',
    };
    return labels[type] || labels.UNKNOWN;
  };

  // Handle action
  const handleAction = (action: string) => {
    if (!scanResult) return;
    
    switch (action) {
      case 'view_details':
        if (scanResult.type === 'PART') {
          router.push(`/mobile/inventory?part=${scanResult.value}`);
        }
        break;
      case 'adjust_qty':
        router.push(`/mobile/inventory/adjust?part=${scanResult.value}`);
        break;
      case 'transfer':
        router.push(`/mobile/inventory/transfer?part=${scanResult.value}`);
        break;
      case 'receive_items':
        router.push(`/mobile/receiving?po=${scanResult.value}`);
        break;
      case 'pick_items':
        router.push(`/mobile/picking?so=${scanResult.value}`);
        break;
      default:
        break;
    }
  };

  // Action button labels
  const actionLabels: Record<string, string> = {
    view_details: 'Xem chi tiết',
    check_inventory: 'Kiểm tra tồn',
    adjust_qty: 'Điều chỉnh SL',
    transfer: 'Chuyển kho',
    print_label: 'In nhãn',
    view_contents: 'Xem hàng trong kho',
    add_item: 'Thêm hàng',
    remove_item: 'Lấy hàng',
    cycle_count: 'Kiểm kê',
    start_operation: 'Bắt đầu',
    complete_operation: 'Hoàn thành',
    record_production: 'Ghi nhận SL',
    report_issue: 'Báo lỗi',
    receive_items: 'Nhận hàng',
    inspect_quality: 'Kiểm tra CL',
    pick_items: 'Xuất hàng',
    manual_lookup: 'Tìm thủ công',
  };

  return (
    <div className="h-full flex flex-col">
      {/* Scanner */}
      <div className="flex-1 relative">
        <BarcodeScanner 
          onScan={handleScan}
          continuous={false}
          className="h-full"
        />
        
        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="text-gray-900 font-medium">Đang xử lý...</span>
            </div>
          </div>
        )}
      </div>

      {/* Scan Result Modal */}
      {scanResult && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setScanResult(null)}
          />
          
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[80vh] overflow-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Kết quả quét
              </h2>
              <button 
                onClick={() => setScanResult(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Type Badge */}
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center text-white',
                  getTypeColor(scanResult.type)
                )}>
                  {getTypeIcon(scanResult.type)}
                </div>
                <div>
                  <div className="text-sm text-gray-500">
                    {getTypeLabel(scanResult.type)}
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                    {scanResult.value}
                  </div>
                </div>
                {scanResult.resolved && (
                  <CheckCircle className="w-6 h-6 text-green-500 ml-auto" />
                )}
              </div>
              
              {/* Entity Details */}
              {scanResult.entity && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2">
                  {scanResult.type === 'PART' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tên:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {scanResult.entity.description}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tồn kho:</span>
                        <span className="font-bold text-blue-600">
                          {scanResult.entity.onHand || scanResult.entity.available || 0}
                        </span>
                      </div>
                      {scanResult.entity.reserved > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Đã đặt:</span>
                          <span className="text-orange-600">
                            {scanResult.entity.reserved}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  
                  {scanResult.type === 'LOCATION' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tên:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {scanResult.entity.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Kho:</span>
                        <span className="text-gray-900 dark:text-white">
                          {scanResult.entity.warehouse}
                        </span>
                      </div>
                    </>
                  )}
                  
                  {scanResult.type === 'WORK_ORDER' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sản phẩm:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {scanResult.entity.description}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Số lượng:</span>
                        <span className="font-bold text-blue-600">
                          {scanResult.entity.qty}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Trạng thái:</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-sm',
                          scanResult.entity.status === 'In Progress' 
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        )}>
                          {scanResult.entity.status}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* Not Found */}
              {!scanResult.resolved && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">Không tìm thấy trong hệ thống</span>
                  </div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-300 mt-1">
                    Mã này chưa được đăng ký hoặc không đúng định dạng
                  </p>
                </div>
              )}
              
              {/* Actions */}
              <div className="space-y-2">
                {scanResult.actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleAction(action)}
                    className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl flex items-center justify-between transition-colors"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">
                      {actionLabels[action] || action}
                    </span>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </div>
              
              {/* Scan Again */}
              <button
                onClick={() => setScanResult(null)}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Quét tiếp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Scans */}
      {recentScans.length > 0 && !scanResult && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-white/90 backdrop-blur rounded-xl shadow-lg p-3">
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
              <History className="w-4 h-4" />
              <span>Quét gần đây</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recentScans.slice(0, 5).map((scan, i) => (
                <button
                  key={i}
                  onClick={() => handleScan(scan.code)}
                  className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-mono whitespace-nowrap"
                >
                  {scan.code.length > 15 ? scan.code.slice(0, 15) + '...' : scan.code}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
