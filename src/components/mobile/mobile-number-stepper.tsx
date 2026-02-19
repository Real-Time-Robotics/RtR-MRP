// =============================================================================
// MOBILE NUMBER STEPPER
// =============================================================================

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { haptic } from './mobile-tokens';

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
            aria-label={label || 'So luong'}
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
