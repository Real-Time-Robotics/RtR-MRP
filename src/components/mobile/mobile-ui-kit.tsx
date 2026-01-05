// =============================================================================
// 📱 RTR MOBILE UI KIT - Professional Mobile-First Components
// Version: 2.0 - Complete Polish Campaign
// =============================================================================

'use client';

import React, { 
  useState, 
  useEffect, 
  useRef, 
  forwardRef,
  createContext,
  useContext,
  useCallback,
  ReactNode
} from 'react';
import { 
  X, 
  ChevronRight,
  Check,
  AlertCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// 🎯 DESIGN TOKENS
// =============================================================================

export const MOBILE_TOKENS = {
  safeArea: {
    top: 'env(safe-area-inset-top, 0px)',
    bottom: 'env(safe-area-inset-bottom, 0px)',
    left: 'env(safe-area-inset-left, 0px)',
    right: 'env(safe-area-inset-right, 0px)',
  },
};

// =============================================================================
// 🔊 HAPTIC FEEDBACK
// =============================================================================

export const haptic = {
  light: () => navigator?.vibrate?.(10),
  medium: () => navigator?.vibrate?.(20),
  heavy: () => navigator?.vibrate?.(30),
  success: () => navigator?.vibrate?.([10, 30, 10]),
  warning: () => navigator?.vibrate?.([20, 40, 20]),
  error: () => navigator?.vibrate?.([30, 50, 30, 50, 30]),
  selection: () => navigator?.vibrate?.(5),
};

// =============================================================================
// 🎴 MOBILE CARD
// =============================================================================

interface MobileCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'outlined' | 'elevated' | 'danger' | 'success' | 'warning';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function MobileCard({
  children,
  className,
  onClick,
  disabled = false,
  variant = 'default',
  padding = 'md',
}: MobileCardProps) {
  const variants = {
    default: 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50',
    outlined: 'bg-transparent border-2 border-gray-200 dark:border-gray-700',
    elevated: 'bg-white dark:bg-gray-800 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50',
    danger: 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50',
    success: 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50',
    warning: 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50',
  };

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onClick={() => {
        if (onClick && !disabled) {
          haptic.selection();
          onClick();
        }
      }}
      className={cn(
        'rounded-2xl transition-all duration-150 w-full overflow-hidden',
        variants[variant],
        paddings[padding],
        onClick && !disabled && 'cursor-pointer active:scale-[0.98] active:opacity-90',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
    >
      {children}
    </div>
  );
}

// =============================================================================
// 🔘 MOBILE BUTTON
// =============================================================================

interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const MobileButton = forwardRef<HTMLButtonElement, MobileButtonProps>(({
  children,
  className,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  onClick,
  ...props
}, ref) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-lg shadow-blue-600/25',
    secondary: 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200',
    outline: 'bg-transparent border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white',
    ghost: 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/25',
    success: 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/25',
  };

  const sizes = {
    sm: 'h-10 min-h-[40px] px-4 text-sm gap-1.5 rounded-xl',
    md: 'h-12 min-h-[48px] px-5 text-base gap-2 rounded-xl',
    lg: 'h-14 min-h-[56px] px-6 text-lg gap-2 rounded-2xl',
    xl: 'h-16 min-h-[64px] px-8 text-xl gap-3 rounded-2xl',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      onClick={(e) => {
        if (!disabled && !loading) {
          haptic.light();
          onClick?.(e);
        }
      }}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-150',
        'active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          <span className="truncate">{children}</span>
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

MobileButton.displayName = 'MobileButton';

// =============================================================================
// 📝 MOBILE INPUT
// =============================================================================

interface MobileInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
  onClear?: () => void;
}

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(({
  className,
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  inputSize = 'md',
  onClear,
  value,
  ...props
}, ref) => {
  const sizes = {
    sm: 'h-10 min-h-[40px] text-sm',
    md: 'h-12 min-h-[48px] text-base',
    lg: 'h-14 min-h-[56px] text-lg',
  };

  const showClear = onClear && value && String(value).length > 0;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          value={value}
          className={cn(
            'w-full rounded-xl border transition-all duration-150',
            'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white',
            'placeholder-gray-400 dark:placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:bg-white dark:focus:bg-gray-800',
            error 
              ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' 
              : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500/20 focus:border-blue-500',
            sizes[inputSize],
            leftIcon ? 'pl-11' : 'pl-4',
            (rightIcon || showClear) ? 'pr-11' : 'pr-4',
            className
          )}
          {...props}
        />
        {showClear && (
          <button
            type="button"
            onClick={() => {
              haptic.light();
              onClear?.();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {rightIcon && !showClear && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{error}</span>
        </p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
});

MobileInput.displayName = 'MobileInput';

// =============================================================================
// 🔍 MOBILE SEARCH BAR
// =============================================================================

interface MobileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
  className?: string;
}

export function MobileSearchBar({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  onSubmit,
  autoFocus = false,
  className,
}: MobileSearchBarProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          'w-full h-12 min-h-[48px] pl-11 pr-4 rounded-xl',
          'bg-gray-100 dark:bg-gray-800 border-0',
          'text-gray-900 dark:text-white placeholder-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-700',
          'transition-all duration-150'
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            haptic.light();
            onChange('');
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// =============================================================================
// 🔢 MOBILE NUMBER STEPPER
// =============================================================================

interface MobileNumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function MobileNumberStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  label,
  unit,
  size = 'md',
  disabled = false,
}: MobileNumberStepperProps) {
  const sizes = {
    sm: { btn: 'w-10 h-10 text-lg', input: 'w-16 h-10 text-lg' },
    md: { btn: 'w-14 h-14 text-2xl', input: 'w-24 h-14 text-2xl' },
    lg: { btn: 'w-16 h-16 text-3xl', input: 'w-28 h-16 text-3xl' },
  };

  const s = sizes[size];

  return (
    <div className="flex flex-col items-center">
      {label && (
        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
          {label}
        </label>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (value > min && !disabled) {
              haptic.light();
              onChange(Math.max(min, value - step));
            }
          }}
          disabled={disabled || value <= min}
          className={cn(
            'flex items-center justify-center rounded-full font-bold transition-all',
            'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
            'active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed',
            s.btn
          )}
        >
          −
        </button>
        
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            value={value}
            onChange={(e) => {
              const v = parseInt(e.target.value) || 0;
              onChange(Math.min(max, Math.max(min, v)));
            }}
            disabled={disabled}
            className={cn(
              'text-center font-bold rounded-xl border-0',
              'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              'disabled:opacity-50',
              '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
              s.input
            )}
          />
          {unit && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-normal">
              {unit}
            </span>
          )}
        </div>
        
        <button
          type="button"
          onClick={() => {
            if (value < max && !disabled) {
              haptic.light();
              onChange(Math.min(max, value + step));
            }
          }}
          disabled={disabled || value >= max}
          className={cn(
            'flex items-center justify-center rounded-full font-bold transition-all',
            'bg-blue-600 text-white shadow-lg shadow-blue-600/30',
            'active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed',
            s.btn
          )}
        >
          +
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// 📋 MOBILE LIST ITEM
// =============================================================================

interface MobileListItemProps {
  title: string;
  subtitle?: string;
  meta?: string;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MobileListItem({
  title,
  subtitle,
  meta,
  leftContent,
  rightContent,
  onClick,
  chevron = false,
  disabled = false,
  className,
}: MobileListItemProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onClick={() => {
        if (onClick && !disabled) {
          haptic.selection();
          onClick();
        }
      }}
      className={cn(
        'flex items-center gap-3 px-4 py-3.5 min-h-[56px]',
        'bg-white dark:bg-gray-800',
        'border-b border-gray-100 dark:border-gray-700/50 last:border-b-0',
        onClick && !disabled && 'cursor-pointer active:bg-gray-50 dark:active:bg-gray-700/50',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {leftContent && <div className="flex-shrink-0">{leftContent}</div>}
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-white truncate">
          {title}
        </div>
        {subtitle && (
          <div className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
      
      {meta && <div className="flex-shrink-0 text-sm text-gray-400">{meta}</div>}
      {rightContent && <div className="flex-shrink-0">{rightContent}</div>}
      {chevron && onClick && (
        <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
      )}
    </div>
  );
}

// =============================================================================
// 🏷️ MOBILE BADGE
// =============================================================================

interface MobileBadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export function MobileBadge({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className,
}: MobileBadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    info: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  const dotColors = {
    default: 'bg-gray-500',
    primary: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-cyan-500',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap',
      variants[variant],
      sizes[size],
      className
    )}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
}

// =============================================================================
// 📄 MOBILE BOTTOM SHEET
// =============================================================================

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showHandle?: boolean;
  height?: 'auto' | 'half' | 'full';
}

export function MobileBottomSheet({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  showHandle = true,
  height = 'auto',
}: MobileBottomSheetProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentTranslate = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimating(true));
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = '';
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0 && sheetRef.current) {
      currentTranslate.current = diff;
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (currentTranslate.current > 100) {
      haptic.light();
      onClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
    currentTranslate.current = 0;
  };

  const heightClasses = {
    auto: 'max-h-[85vh]',
    half: 'h-[50vh]',
    full: 'h-[95vh]',
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div 
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          isAnimating ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />
      
      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        <div
          ref={sheetRef}
          className={cn(
            'w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl',
            'transition-transform duration-300 ease-out',
            heightClasses[height],
            isAnimating ? 'translate-y-0' : 'translate-y-full'
          )}
          style={{ paddingBottom: MOBILE_TOKENS.safeArea.bottom }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {showHandle && (
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>
          )}
          
          {title && (
            <div className="flex items-start justify-between px-4 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-sm text-gray-500 truncate mt-0.5">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 -mr-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          )}
          
          <div className={cn(
            'overflow-y-auto overflow-x-hidden',
            height === 'auto' ? 'max-h-[65vh]' : 'flex-1'
          )}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ⏳ MOBILE LOADING
// =============================================================================

export function MobileLoading({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );
}

// =============================================================================
// 📭 MOBILE EMPTY STATE
// =============================================================================

interface MobileEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function MobileEmptyState({ icon, title, description, action }: MobileEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-xs">{description}</p>
      )}
      {action && (
        <MobileButton variant="primary" size="md" onClick={action.onClick} className="mt-4">
          {action.label}
        </MobileButton>
      )}
    </div>
  );
}

// =============================================================================
// 🔔 MOBILE TOAST
// =============================================================================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

const ToastContext = createContext<{ toast: (type: ToastType, message: string) => void } | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within MobileToastProvider');
  return context;
}

export function MobileToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string, duration = 3000) => {
    const id = Math.random().toString(36).slice(2);
    
    if (type === 'success') haptic.success();
    else if (type === 'error') haptic.error();
    else haptic.light();

    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-amber-600',
    info: 'bg-blue-600',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-0 inset-x-0 z-[100] pointer-events-none px-4 pt-4"
        style={{ paddingTop: `calc(${MOBILE_TOKENS.safeArea.top} + 1rem)` }}>
        <div className="max-w-lg mx-auto space-y-2">
          {toasts.map((t) => (
            <div key={t.id} className={cn(
              'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl text-white shadow-lg',
              'animate-in slide-in-from-top-2 fade-in duration-300',
              colors[t.type]
            )}>
              {icons[t.type]}
              <span className="flex-1 font-medium truncate">{t.message}</span>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

// =============================================================================
// 🦴 MOBILE SKELETON
// =============================================================================

export function MobileSkeleton({ className, width, height }: { 
  className?: string; 
  width?: string | number; 
  height?: string | number; 
}) {
  return (
    <div
      className={cn('bg-gray-200 dark:bg-gray-700 animate-pulse rounded-xl', className)}
      style={{ width, height }}
    />
  );
}

// =============================================================================
// 📱 MOBILE ACTION BUTTON (FAB)
// =============================================================================

interface MobileActionButtonProps {
  icon: ReactNode;
  onClick: () => void;
  label?: string;
  variant?: 'primary' | 'secondary';
}

export function MobileActionButton({
  icon,
  onClick,
  label,
  variant = 'primary',
}: MobileActionButtonProps) {
  const variants = {
    primary: 'bg-blue-600 text-white shadow-lg shadow-blue-600/30',
    secondary: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-lg border border-gray-200',
  };

  return (
    <button
      onClick={() => {
        haptic.medium();
        onClick();
      }}
      className={cn(
        'fixed right-4 z-40 flex items-center gap-2 rounded-full transition-all active:scale-95',
        label ? 'px-5 h-14' : 'w-14 h-14 justify-center',
        variants[variant]
      )}
      style={{ bottom: `calc(${MOBILE_TOKENS.safeArea.bottom} + 5rem)` }}
    >
      {icon}
      {label && <span className="font-medium">{label}</span>}
    </button>
  );
}
