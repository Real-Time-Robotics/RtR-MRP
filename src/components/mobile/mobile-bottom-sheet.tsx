// =============================================================================
// MOBILE BOTTOM SHEET
// =============================================================================

'use client';

import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOBILE_TOKENS, haptic } from './mobile-tokens';

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
                aria-label="Dong"
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
