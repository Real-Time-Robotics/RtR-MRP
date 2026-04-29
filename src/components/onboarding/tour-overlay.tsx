// Onboarding tour overlay — first login walkthrough (TIP-S285-05)
'use client';

import React, { useState, useEffect } from 'react';
import { Factory, LayoutDashboard, Play, Smartphone } from 'lucide-react';

const TOUR_KEY = 'rtr-mrp-onboarding-v1';

interface TourStep {
  title: string;
  body: string;
  icon: React.ElementType;
}

const STEPS: TourStep[] = [
  {
    title: 'Chào mừng đến RTR-MRP',
    body: 'Tour 1 phút giới thiệu app. Có thể skip bất kỳ lúc nào.',
    icon: Factory,
  },
  {
    title: 'Menu chính',
    body: '9 cụm chức năng bên trái. Tuỳ role bạn thấy 5-9 cụm. Click expand để xem sub-menu.',
    icon: LayoutDashboard,
  },
  {
    title: 'Bắt đầu nhanh',
    body: 'Tạo work center, work order, plan trong 3 click từ trang chủ.',
    icon: Play,
  },
  {
    title: 'Operator dùng tablet',
    body: 'Trang Nhập ca (Sản xuất → Nhập ca) mobile-first cho shop floor.',
    icon: Smartphone,
  },
];

export function TourOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(TOUR_KEY);
    if (!seen) {
      setVisible(true);
    }
  }, []);

  function complete() {
    localStorage.setItem(TOUR_KEY, 'true');
    setVisible(false);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      complete();
    }
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" role="dialog" aria-label="Onboarding tour">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-96 max-w-[90vw] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 p-3">
            <Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="font-bold text-lg">{current.title}</h2>
            <p className="text-xs text-muted-foreground">{step + 1}/{STEPS.length}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{current.body}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={complete}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Trước
              </button>
            )}
            <button
              onClick={next}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              {step < STEPS.length - 1 ? 'Tiếp →' : 'Hoàn thành'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
