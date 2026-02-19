'use client';

// =============================================================================
// MEASUREMENTS INPUT PAGE
// Phase 11: Quality Management
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity,
  Plus,
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Calculator,
  History,
  Upload,
  Keyboard
} from 'lucide-react';
import { ProcessCharacteristic, SPCEngine, Measurement } from '@/lib/spc';
import { clientLogger } from '@/lib/client-logger';

export default function MeasurementsPage() {
  const [characteristics, setCharacteristics] = useState<ProcessCharacteristic[]>([]);
  const [selectedChar, setSelectedChar] = useState<ProcessCharacteristic | null>(null);
  const [values, setValues] = useState<string[]>([]);
  const [recentMeasurements, setRecentMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Additional fields
  const [operatorId, setOperatorId] = useState('');
  const [machineId, setMachineId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [notes, setNotes] = useState('');
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetchCharacteristics();
  }, []);

  useEffect(() => {
    if (selectedChar) {
      setValues(new Array(selectedChar.subgroupSize).fill(''));
      fetchRecentMeasurements(selectedChar.id);
    }
  }, [selectedChar]);

  const fetchCharacteristics = async () => {
    try {
      const response = await fetch('/api/v2/quality?view=characteristics');
      const data = await response.json();
      if (data.success) {
        setCharacteristics(data.data.characteristics);
        if (data.data.characteristics.length > 0) {
          setSelectedChar(data.data.characteristics[0]);
        }
      }
    } catch (error) {
      clientLogger.error('Failed to fetch characteristics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentMeasurements = async (charId: string) => {
    try {
      const response = await fetch(`/api/v2/quality?view=measurements&characteristicId=${charId}&limit=10`);
      const data = await response.json();
      if (data.success) {
        setRecentMeasurements(data.data.measurements);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch measurements:', error);
    }
  };

  const handleValueChange = (index: number, value: string) => {
    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);
    
    // Auto-focus next input on valid entry
    if (value && !isNaN(parseFloat(value)) && index < values.length - 1) {
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus();
      }, 50);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index < values.length - 1) {
        inputRefs.current[index + 1]?.focus();
      } else {
        handleSubmit();
      }
    } else if (e.key === 'Tab' && !e.shiftKey && index === values.length - 1) {
      // Allow natural tab to move to operator field
    } else if (e.key === 'ArrowDown' && index < values.length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    if (!selectedChar) return;
    
    const numericValues = values.map(v => parseFloat(v));
    if (numericValues.some(isNaN)) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ các giá trị số' });
      return;
    }
    
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/v2/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_measurement',
          characteristicId: selectedChar.id,
          values: numericValues,
          operatorId: operatorId || undefined,
          machineId: machineId || undefined,
          batchId: batchId || undefined,
          notes: notes || undefined
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Đã lưu dữ liệu đo lường thành công!' });
        setValues(new Array(selectedChar.subgroupSize).fill(''));
        setNotes('');
        fetchRecentMeasurements(selectedChar.id);
        inputRefs.current[0]?.focus();
        
        // Check for alerts
        if (data.data.alert) {
          setMessage({ 
            type: 'error', 
            text: `⚠️ Cảnh báo: ${data.data.alert.title}` 
          });
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Lỗi khi lưu dữ liệu' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi kết nối server' });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    if (selectedChar) {
      setValues(new Array(selectedChar.subgroupSize).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  // Calculate statistics from current values
  const currentStats = React.useMemo(() => {
    const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
    if (numericValues.length === 0) return null;
    
    return {
      mean: SPCEngine.mean(numericValues),
      range: SPCEngine.range(numericValues),
      stdDev: SPCEngine.stdDev(numericValues),
      min: Math.min(...numericValues),
      max: Math.max(...numericValues)
    };
  }, [values]);

  // Check if values are within spec
  const isWithinSpec = React.useMemo(() => {
    if (!selectedChar || !currentStats) return { all: true, results: [] };
    
    const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
    const results = numericValues.map(v => ({
      value: v,
      withinSpec: v >= selectedChar.lsl && v <= selectedChar.usl,
      nearLimit: (v < selectedChar.lsl + (selectedChar.usl - selectedChar.lsl) * 0.1) ||
                 (v > selectedChar.usl - (selectedChar.usl - selectedChar.lsl) * 0.1)
    }));
    
    return {
      all: results.every(r => r.withinSpec),
      results
    };
  }, [values, selectedChar, currentStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nhập Dữ liệu Đo lường</h1>
          <p className="text-gray-500 dark:text-gray-400">Ghi nhận giá trị đo cho kiểm soát quy trình</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Keyboard className="h-4 w-4" />
          <span>Enter/Tab để chuyển ô, Ctrl+S để lưu</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Characteristic Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Chọn đặc tính kiểm soát
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {characteristics.map((char) => (
                <button
                  key={char.id}
                  onClick={() => setSelectedChar(char)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    selectedChar?.id === char.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 ring-2 ring-primary-500'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">{char.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>n = {char.subgroupSize}</span>
                    <span>•</span>
                    <span>{char.unit}</span>
                    <span>•</span>
                    <span>LSL: {char.lsl} - USL: {char.usl}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Measurement Values Input */}
          {selectedChar && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Giá trị đo ({selectedChar.subgroupSize} mẫu)
                </h3>
                <div className="text-sm text-gray-500">
                  Đơn vị: <span className="font-medium">{selectedChar.unit}</span>
                </div>
              </div>
              
              {/* Message */}
              {message && (
                <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                  message.type === 'success' 
                    ? 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                    : 'bg-danger-50 text-danger-700 dark:bg-danger-900/20 dark:text-danger-400'
                }`}>
                  {message.type === 'success' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                  {message.text}
                </div>
              )}
              
              {/* Spec limits info */}
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">LSL:</span>
                  <span className="ml-2 font-mono font-medium text-danger-600">{selectedChar.lsl}</span>
                </div>
                <div className="text-center">
                  <span className="text-gray-500">Target:</span>
                  <span className="ml-2 font-mono font-medium text-purple-600">
                    {selectedChar.targetValue || selectedChar.nominalValue}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500">USL:</span>
                  <span className="ml-2 font-mono font-medium text-danger-600">{selectedChar.usl}</span>
                </div>
              </div>
              
              {/* Input grid */}
              <div className="grid grid-cols-5 gap-3 mb-4">
                {values.map((value, index) => {
                  const numValue = parseFloat(value);
                  const isValid = !isNaN(numValue);
                  const isOutOfSpec = isValid && (numValue < selectedChar.lsl || numValue > selectedChar.usl);
                  const isNearLimit = isValid && !isOutOfSpec && (
                    numValue < selectedChar.lsl + (selectedChar.usl - selectedChar.lsl) * 0.1 ||
                    numValue > selectedChar.usl - (selectedChar.usl - selectedChar.lsl) * 0.1
                  );
                  
                  return (
                    <div key={index} className="relative">
                      <label className="block text-xs text-gray-500 mb-1 text-center">
                        #{index + 1}
                      </label>
                      <input
                        ref={el => { inputRefs.current[index] = el; }}
                        type="number"
                        step="any"
                        value={value}
                        onChange={(e) => handleValueChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        aria-label={`Giá trị đo #${index + 1}`}
                        className={`w-full px-3 py-3 text-center font-mono text-lg border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                          isOutOfSpec
                            ? 'border-danger-500 bg-danger-50 dark:bg-danger-900/20'
                            : isNearLimit
                            ? 'border-warning-500 bg-warning-50 dark:bg-warning-900/20'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        }`}
                        placeholder="0.000"
                      />
                      {isOutOfSpec && (
                        <div className="absolute -top-1 -right-1">
                          <AlertTriangle className="h-4 w-4 text-danger-500" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Calculated stats */}
              {currentStats && (
                <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg grid grid-cols-5 gap-4 text-sm mb-4">
                  <div className="text-center">
                    <p className="text-gray-500 text-xs">X̄</p>
                    <p className="font-mono font-medium">{currentStats.mean.toFixed(3)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-xs">R</p>
                    <p className="font-mono font-medium">{currentStats.range.toFixed(3)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-xs">σ</p>
                    <p className="font-mono font-medium">{currentStats.stdDev.toFixed(3)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-xs">Min</p>
                    <p className="font-mono font-medium">{currentStats.min.toFixed(3)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-xs">Max</p>
                    <p className="font-mono font-medium">{currentStats.max.toFixed(3)}</p>
                  </div>
                </div>
              )}
              
              {/* Additional fields */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Operator
                  </label>
                  <input
                    type="text"
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    aria-label="Operator"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="ID / Tên"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Máy
                  </label>
                  <input
                    type="text"
                    value={machineId}
                    onChange={(e) => setMachineId(e.target.value)}
                    aria-label="Máy"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="Mã máy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Batch
                  </label>
                  <input
                    type="text"
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    aria-label="Batch"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="Số lô"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  aria-label="Ghi chú"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="Ghi chú thêm (nếu có)"
                />
              </div>
              
              {/* Action buttons */}
              <div className="flex justify-between">
                <button
                  onClick={handleClear}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving || values.some(v => !v || isNaN(parseFloat(v)))}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Lưu dữ liệu
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recent Measurements */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Lịch sử gần đây
            </h3>
          </div>
          
          {recentMeasurements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Chưa có dữ liệu
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {recentMeasurements.map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">#{m.sampleNumber}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(m.timestamp).toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-mono mb-1">
                    [{m.values.map(v => v.toFixed(2)).join(', ')}]
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span>X̄: <span className="font-medium">{m.mean.toFixed(3)}</span></span>
                    <span>R: <span className="font-medium">{m.range.toFixed(3)}</span></span>
                  </div>
                  {m.operatorId && (
                    <div className="text-xs text-gray-500 mt-1">
                      Op: {m.operatorId}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
