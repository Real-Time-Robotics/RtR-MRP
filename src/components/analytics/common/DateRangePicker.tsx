"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DateRangeConfig } from "@/lib/analytics/types";

export interface DateRangePickerProps {
  value?: DateRangeConfig;
  onChange: (value: DateRangeConfig) => void;
  presets?: { value: string; label: string }[];
  showPresets?: boolean;
  className?: string;
}

const DEFAULT_PRESETS = [
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "last7days", label: "7 ngày qua" },
  { value: "last30days", label: "30 ngày qua" },
  { value: "thisMonth", label: "Tháng này" },
  { value: "lastMonth", label: "Tháng trước" },
  { value: "thisQuarter", label: "Quý này" },
  { value: "thisYear", label: "Năm nay" },
];

export function DateRangePicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  showPresets = true,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({
    from: value?.from ? new Date(value.from) : undefined,
    to: value?.to ? new Date(value.to) : undefined,
  });

  const handlePresetChange = (preset: string) => {
    onChange({
      type: "preset",
      preset: preset as DateRangeConfig['preset'],
    });
    setIsOpen(false);
  };

  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    if (!range) return;

    setSelectedRange(range);

    if (range.from && range.to) {
      onChange({
        type: "custom",
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      });
    }
  };

  const getDisplayText = () => {
    if (value?.type === "preset" && value.preset) {
      const preset = presets.find((p) => p.value === value.preset);
      return preset?.label || value.preset;
    }

    if (value?.type === "custom" && value.from && value.to) {
      const from = new Date(value.from);
      const to = new Date(value.to);
      return `${format(from, "dd/MM/yyyy", { locale: vi })} - ${format(to, "dd/MM/yyyy", { locale: vi })}`;
    }

    return "Chọn khoảng thời gian";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getDisplayText()}
          <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {showPresets && (
            <div className="border-r p-3 space-y-1">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Cài đặt sẵn
              </p>
              {presets.map((preset) => (
                <Button
                  key={preset.value}
                  variant={
                    value?.type === "preset" && value.preset === preset.value
                      ? "secondary"
                      : "ghost"
                  }
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handlePresetChange(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}
          <div className="p-3">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Tùy chỉnh
            </p>
            <Calendar
              mode="range"
              selected={selectedRange}
              onSelect={handleCustomRangeSelect}
              numberOfMonths={2}
              locale={vi}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default DateRangePicker;
