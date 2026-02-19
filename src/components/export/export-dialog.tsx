'use client';

import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  File,
  X,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExport, type ExportFormat, type ExportEntity } from '@/lib/hooks/use-export';
import { useLanguage } from '@/lib/i18n/language-context';

// =============================================================================
// EXPORT DIALOG
// Modal dialog for exporting data
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEntity?: ExportEntity;
  title?: string;
}

interface ExportOption {
  id: ExportEntity;
  labelKey: string;
  descKey: string;
  icon: React.ReactNode;
}

interface FormatOption {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  extension: string;
}

// =============================================================================
// OPTIONS DATA
// =============================================================================

const entityOptions: ExportOption[] = [
  { id: 'sales-orders', labelKey: 'export.salesOrders', descKey: 'export.salesOrdersDesc', icon: <FileText className="w-5 h-5" /> },
  { id: 'parts', labelKey: 'export.parts', descKey: 'export.partsDesc', icon: <FileSpreadsheet className="w-5 h-5" /> },
  { id: 'inventory', labelKey: 'export.inventory', descKey: 'export.inventoryDesc', icon: <FileSpreadsheet className="w-5 h-5" /> },
  { id: 'suppliers', labelKey: 'export.suppliers', descKey: 'export.suppliersDesc', icon: <FileText className="w-5 h-5" /> },
  { id: 'customers', labelKey: 'export.customers', descKey: 'export.customersDesc', icon: <FileText className="w-5 h-5" /> },
  { id: 'work-orders', labelKey: 'export.workOrders', descKey: 'export.workOrdersDesc', icon: <FileSpreadsheet className="w-5 h-5" /> },
  { id: 'quality-records', labelKey: 'export.qualityRecords', descKey: 'export.qualityRecordsDesc', icon: <FileText className="w-5 h-5" /> },
];

const formatOptions: FormatOption[] = [
  { id: 'xlsx', label: 'Excel', description: 'Microsoft Excel', icon: <FileSpreadsheet className="w-5 h-5 text-green-600" />, extension: '.xls' },
  { id: 'csv', label: 'CSV', description: 'Comma-separated', icon: <File className="w-5 h-5 text-blue-600" />, extension: '.csv' },
  { id: 'pdf', label: 'PDF', description: 'Printable report', icon: <FileText className="w-5 h-5 text-red-600" />, extension: '.html' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function ExportDialog({ isOpen, onClose, defaultEntity, title }: ExportDialogProps) {
  const { t } = useLanguage();
  const [selectedEntity, setSelectedEntity] = useState<ExportEntity>(defaultEntity || 'sales-orders');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('xlsx');
  const [customTitle, setCustomTitle] = useState(title || '');
  const [exportSuccess, setExportSuccess] = useState(false);

  const { isExporting, error, exportData, lastExport } = useExport();

  const handleExport = async () => {
    setExportSuccess(false);
    const success = await exportData({
      format: selectedFormat,
      entity: selectedEntity,
      title: customTitle || undefined,
    });

    if (success) {
      setExportSuccess(true);
      setTimeout(() => {
        onClose();
        setExportSuccess(false);
      }, 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        role="presentation"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <Download className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">{t("export.title")}</h2>
                <p className="text-sm text-gray-500">{t("export.subtitle")}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Đóng"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Success Message */}
            {exportSuccess && lastExport && (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">{t("export.success")}</p>
                  <p className="text-sm text-green-600 dark:text-green-400">{lastExport.filename}</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">{t("export.errorTitle")}</p>
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* Entity Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t("export.selectData")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {entityOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedEntity(option.id)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                      selectedEntity === option.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <span className={cn(
                      'p-2 rounded-lg',
                      selectedEntity === option.id
                        ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    )}>
                      {option.icon}
                    </span>
                    <div>
                      <p className={cn(
                        'font-medium text-sm',
                        selectedEntity === option.id
                          ? 'text-purple-900 dark:text-purple-100'
                          : 'text-gray-900 dark:text-white'
                      )}>
                        {t(option.labelKey)}
                      </p>
                      <p className="text-xs text-gray-500">{t(option.descKey)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t("export.fileFormat")}
              </label>
              <div className="flex gap-3">
                {formatOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedFormat(option.id)}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                      selectedFormat === option.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    {option.icon}
                    <div className="text-center">
                      <p className={cn(
                        'font-medium text-sm',
                        selectedFormat === option.id
                          ? 'text-purple-900 dark:text-purple-100'
                          : 'text-gray-900 dark:text-white'
                      )}>
                        {option.label}
                      </p>
                      <p className="text-xs text-gray-500">{option.extension}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("export.reportTitle")}
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={t("export.titlePlaceholder")}
                aria-label={t("export.reportTitle")}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {t("export.cancel")}
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("export.exporting")}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {t("export.exportFile")}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// =============================================================================
// EXPORT BUTTON (Quick export)
// =============================================================================

interface ExportButtonProps {
  entity: ExportEntity;
  format?: ExportFormat;
  label?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function ExportButton({
  entity,
  format = 'xlsx',
  label,
  className,
  variant = 'default',
  size = 'md',
}: ExportButtonProps) {
  const { t } = useLanguage();
  const { isExporting, exportData } = useExport();
  const resolvedLabel = label || t("export.exportExcel");

  const handleExport = async () => {
    await exportData({ format, entity });
  };

  const variantStyles = {
    default: 'bg-purple-600 text-white hover:bg-purple-700',
    outline: 'border border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20',
    ghost: 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={cn(
        'flex items-center gap-2 rounded-xl font-medium transition-all disabled:opacity-50',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {resolvedLabel}
    </button>
  );
}

// =============================================================================
// EXPORT MENU (Dropdown with format options)
// =============================================================================

interface ExportMenuProps {
  entity: ExportEntity;
  label?: string;
  className?: string;
}

export function ExportMenu({ entity, label, className }: ExportMenuProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const { isExporting, exportData } = useExport();
  const resolvedLabel = label || t("export.exportLabel");

  const handleExport = async (format: ExportFormat) => {
    setIsOpen(false);
    await exportData({ format, entity });
  };

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {resolvedLabel}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" role="presentation" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            {formatOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleExport(option.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                {option.icon}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{option.label}</p>
                  <p className="text-xs text-gray-500">{option.description}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ExportDialog;
