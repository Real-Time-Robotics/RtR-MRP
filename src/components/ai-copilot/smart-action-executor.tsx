'use client';

import { useState } from 'react';
import {
  AlertTriangle, CheckCircle, XCircle, Shield, Info,
  Loader2, ArrowRight, Undo2, History, ChevronDown,
  ChevronUp, AlertCircle, Lock, Unlock, Eye
} from 'lucide-react';

// =============================================================================
// RTR AI COPILOT - SMART ACTION EXECUTOR
// Handles AI-suggested actions with validation and approval workflows
// =============================================================================

// Types
export interface AIAction {
  id: string;
  type: 'create' | 'update' | 'delete' | 'navigate' | 'export' | 'notify';
  label: string;
  labelVi: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  payload?: Record<string, unknown>;
  endpoint?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

export interface ExecutionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  rollbackId?: string;
}

interface ActionExecutorProps {
  action: AIAction;
  language: 'en' | 'vi';
  onExecute: (action: AIAction) => Promise<ExecutionResult>;
  onCancel?: () => void;
  userRole?: string;
}

// Risk level configurations
const RISK_CONFIG: Record<string, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
  approvalRequired: string[];
  confirmationRequired: boolean;
  cooldownMs: number;
}> = {
  low: {
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle,
    approvalRequired: [],
    confirmationRequired: false,
    cooldownMs: 0,
  },
  medium: {
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Info,
    approvalRequired: [],
    confirmationRequired: true,
    cooldownMs: 1000,
  },
  high: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: AlertTriangle,
    approvalRequired: ['manager', 'admin'],
    confirmationRequired: true,
    cooldownMs: 3000,
  },
  critical: {
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: AlertCircle,
    approvalRequired: ['director', 'admin'],
    confirmationRequired: true,
    cooldownMs: 5000,
  },
};

// Validation rules per action type
const validateAction = (action: AIAction): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];
  
  // Basic validation
  if (!action.id) {
    errors.push('Action ID is required');
  }
  
  if (!action.type) {
    errors.push('Action type is required');
  }
  
  // Type-specific validation
  switch (action.type) {
    case 'create':
      if (!action.endpoint) {
        warnings.push('No endpoint specified - action may not be executable');
      }
      info.push('This will create a new record in the system');
      break;
      
    case 'update':
      if (!action.payload?.id) {
        errors.push('Update action requires a target ID');
      }
      info.push('This will modify an existing record');
      break;
      
    case 'delete':
      errors.push('Delete actions require manager approval');
      info.push('This action cannot be undone automatically');
      break;
      
    case 'export':
      if (action.payload?.format && !['xlsx', 'pdf', 'csv'].includes(String(action.payload.format))) {
        warnings.push('Unsupported export format');
      }
      info.push('Data will be exported based on current filters');
      break;

    case 'navigate':
      // Navigation is always safe
      break;

    case 'notify':
      if (!action.payload?.recipients || !Array.isArray(action.payload.recipients) || action.payload.recipients.length === 0) {
        warnings.push('No recipients specified');
      }
      break;
  }
  
  // Risk-based warnings
  if (action.riskLevel === 'high' || action.riskLevel === 'critical') {
    warnings.push('This action has been flagged as high-risk');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
  };
};

// Smart Action Executor Component
export default function SmartActionExecutor({
  action,
  language,
  onExecute,
  onCancel,
  userRole = 'user',
}: ActionExecutorProps) {
  const [stage, setStage] = useState<'review' | 'confirm' | 'executing' | 'complete' | 'error'>('review');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const riskConfig = RISK_CONFIG[action.riskLevel] || RISK_CONFIG.low;
  const RiskIcon = riskConfig.icon;
  
  // Check if user has permission
  const hasPermission = () => {
    if (riskConfig.approvalRequired.length === 0) return true;
    return riskConfig.approvalRequired.includes(userRole);
  };
  
  // Validate action
  const handleValidate = () => {
    const result = validateAction(action);
    setValidation(result);
    
    if (result.isValid) {
      if (riskConfig.confirmationRequired) {
        setStage('confirm');
        
        // Start cooldown if needed
        if (riskConfig.cooldownMs > 0) {
          setCountdown(riskConfig.cooldownMs / 1000);
          const interval = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) {
                clearInterval(interval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } else {
        handleExecute();
      }
    }
  };
  
  // Execute action
  const handleExecute = async () => {
    if (!hasPermission()) {
      setResult({
        success: false,
        message: language === 'vi' 
          ? 'Bạn không có quyền thực hiện hành động này'
          : 'You do not have permission to perform this action',
      });
      setStage('error');
      return;
    }
    
    setStage('executing');
    
    try {
      const execResult = await onExecute(action);
      setResult(execResult);
      setStage(execResult.success ? 'complete' : 'error');
    } catch (error) {
      setResult({
        success: false,
        message: language === 'vi'
          ? 'Đã xảy ra lỗi khi thực hiện hành động'
          : 'An error occurred while executing the action',
      });
      setStage('error');
    }
  };
  
  // Render based on stage
  const renderContent = () => {
    switch (stage) {
      case 'review':
        return (
          <div className="space-y-4">
            {/* Action header */}
            <div className={`p-4 rounded-lg border ${riskConfig.bgColor} ${riskConfig.borderColor}`}>
              <div className="flex items-start space-x-3">
                <RiskIcon className={`h-6 w-6 ${riskConfig.color} mt-0.5`} />
                <div className="flex-1">
                  <h4 className={`font-semibold ${riskConfig.color}`}>
                    {language === 'vi' ? action.labelVi : action.label}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                  
                  {/* Risk badge */}
                  <div className="flex items-center mt-2 space-x-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskConfig.bgColor} ${riskConfig.color}`}>
                      {language === 'vi' ? 'Rủi ro: ' : 'Risk: '}
                      {action.riskLevel.toUpperCase()}
                    </span>
                    {action.requiresApproval && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 flex items-center">
                        <Lock className="h-3 w-3 mr-1" />
                        {language === 'vi' ? 'Cần phê duyệt' : 'Requires approval'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Details toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800"
            >
              {showDetails ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              {language === 'vi' ? 'Chi tiết kỹ thuật' : 'Technical details'}
            </button>
            
            {showDetails && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm font-mono">
                <p><strong>Type:</strong> {action.type}</p>
                <p><strong>ID:</strong> {action.id}</p>
                {action.endpoint && <p><strong>Endpoint:</strong> {action.endpoint}</p>}
                {action.payload && (
                  <div>
                    <strong>Payload:</strong>
                    <pre className="mt-1 text-xs overflow-auto">
                      {JSON.stringify(action.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
            
            {/* Validation results */}
            {validation && (
              <div className="space-y-2">
                {validation.errors.map((error, i) => (
                  <div key={i} className="flex items-start text-red-600 text-sm">
                    <XCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    {error}
                  </div>
                ))}
                {validation.warnings.map((warning, i) => (
                  <div key={i} className="flex items-start text-yellow-600 text-sm">
                    <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    {warning}
                  </div>
                ))}
                {validation.info.map((info, i) => (
                  <div key={i} className="flex items-start text-blue-600 text-sm">
                    <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    {info}
                  </div>
                ))}
              </div>
            )}
            
            {/* Permission warning */}
            {!hasPermission() && (
              <div className="flex items-start p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <Lock className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                {language === 'vi'
                  ? 'Bạn cần quyền cao hơn để thực hiện hành động này'
                  : 'You need higher privileges to perform this action'}
              </div>
            )}
            
            {/* Action buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                onClick={handleValidate}
                disabled={!hasPermission()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Shield className="h-4 w-4 mr-2" />
                {language === 'vi' ? 'Xác nhận & Thực hiện' : 'Validate & Execute'}
              </button>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
              )}
            </div>
          </div>
        );
        
      case 'confirm':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
                <div>
                  <h4 className="font-semibold text-yellow-800">
                    {language === 'vi' ? 'Xác nhận hành động' : 'Confirm Action'}
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    {language === 'vi'
                      ? 'Bạn có chắc chắn muốn thực hiện hành động này?'
                      : 'Are you sure you want to perform this action?'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Action summary */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">{language === 'vi' ? action.labelVi : action.label}</p>
              <p className="text-sm text-gray-600">{action.description}</p>
            </div>
            
            {/* Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleExecute}
                disabled={countdown > 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                {countdown > 0 ? (
                  <span>{language === 'vi' ? `Chờ ${countdown}s` : `Wait ${countdown}s`}</span>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {language === 'vi' ? 'Xác nhận' : 'Confirm'}
                  </>
                )}
              </button>
              <button
                onClick={() => setStage('review')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {language === 'vi' ? 'Quay lại' : 'Go Back'}
              </button>
            </div>
          </div>
        );
        
      case 'executing':
        return (
          <div className="py-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">
              {language === 'vi' ? 'Đang thực hiện...' : 'Executing...'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {language === 'vi' ? action.labelVi : action.label}
            </p>
          </div>
        );
        
      case 'complete':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <h4 className="font-semibold text-green-800">
                    {language === 'vi' ? 'Thành công!' : 'Success!'}
                  </h4>
                  <p className="text-sm text-green-700 mt-1">{result?.message}</p>
                </div>
              </div>
            </div>
            
            {/* Rollback option */}
            {result?.rollbackId && (
              <button className="flex items-center text-sm text-gray-600 hover:text-gray-800">
                <Undo2 className="h-4 w-4 mr-1" />
                {language === 'vi' ? 'Hoàn tác' : 'Undo'}
              </button>
            )}
            
            {/* Close button */}
            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                {language === 'vi' ? 'Đóng' : 'Close'}
              </button>
            )}
          </div>
        );
        
      case 'error':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <XCircle className="h-6 w-6 text-red-600" />
                <div>
                  <h4 className="font-semibold text-red-800">
                    {language === 'vi' ? 'Lỗi!' : 'Error!'}
                  </h4>
                  <p className="text-sm text-red-700 mt-1">{result?.message}</p>
                </div>
              </div>
            </div>
            
            {/* Retry button */}
            <div className="flex space-x-3">
              <button
                onClick={() => setStage('review')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {language === 'vi' ? 'Thử lại' : 'Try Again'}
              </button>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {language === 'vi' ? 'Đóng' : 'Close'}
                </button>
              )}
            </div>
          </div>
        );
    }
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">
            {language === 'vi' ? 'Smart Action Executor' : 'Smart Action Executor'}
          </h3>
        </div>
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <History className="h-3.5 w-3.5" />
          <span>{language === 'vi' ? 'Được giám sát' : 'Audited'}</span>
        </div>
      </div>
      
      {/* Content */}
      {renderContent()}
    </div>
  );
}

// Quick action button component
export function QuickActionButton({
  action,
  language,
  onClick,
  size = 'md',
}: {
  action: AIAction;
  language: 'en' | 'vi';
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const riskConfig = RISK_CONFIG[action.riskLevel] || RISK_CONFIG.low;
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };
  
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-lg border font-medium transition-colors ${sizeClasses[size]} ${riskConfig.bgColor} ${riskConfig.color} ${riskConfig.borderColor} hover:opacity-80`}
    >
      {action.requiresApproval && <Lock className="h-3 w-3 mr-1" />}
      {language === 'vi' ? action.labelVi : action.label}
      <ArrowRight className="h-3 w-3 ml-1" />
    </button>
  );
}
