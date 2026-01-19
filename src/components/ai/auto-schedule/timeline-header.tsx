'use client';

import React from 'react';
import { format, isToday, isSunday, isSaturday, getWeek } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ViewMode } from './gantt-chart';

// =============================================================================
// TYPES
// =============================================================================

export interface TimelineHeaderProps {
  days: Date[];
  viewMode: ViewMode;
  dayWidth: number;
  height: number;
}

// =============================================================================
// TIMELINE HEADER COMPONENT
// =============================================================================

export function TimelineHeader({
  days,
  viewMode,
  dayWidth,
  height,
}: TimelineHeaderProps) {
  // Group days by week/month for secondary header
  const getMonthGroups = () => {
    const groups: { label: string; days: number; startIndex: number }[] = [];
    let currentMonth = '';
    let currentGroup: { label: string; days: number; startIndex: number } | null = null;

    days.forEach((day, index) => {
      const monthLabel = format(day, 'MMMM yyyy', { locale: vi });
      if (monthLabel !== currentMonth) {
        if (currentGroup) {
          groups.push(currentGroup);
        }
        currentMonth = monthLabel;
        currentGroup = { label: monthLabel, days: 1, startIndex: index };
      } else if (currentGroup) {
        currentGroup.days++;
      }
    });

    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups;
  };

  const getWeekGroups = () => {
    const groups: { label: string; days: number; startIndex: number }[] = [];
    let currentWeek = -1;
    let currentGroup: { label: string; days: number; startIndex: number } | null = null;

    days.forEach((day, index) => {
      const weekNum = getWeek(day, { locale: vi });
      if (weekNum !== currentWeek) {
        if (currentGroup) {
          groups.push(currentGroup);
        }
        currentWeek = weekNum;
        currentGroup = { label: `Tuần ${weekNum}`, days: 1, startIndex: index };
      } else if (currentGroup) {
        currentGroup.days++;
      }
    });

    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups;
  };

  const monthGroups = getMonthGroups();
  const weekGroups = viewMode !== 'month' ? getWeekGroups() : [];

  return (
    <div className="sticky top-0 z-10 bg-white border-b" style={{ height }}>
      {/* Month row (always shown) */}
      <div className="flex border-b" style={{ height: height / 2 }}>
        {monthGroups.map((group, index) => (
          <div
            key={`month-${index}`}
            className="flex items-center justify-center border-r bg-gray-50 font-medium text-sm"
            style={{ width: group.days * dayWidth }}
          >
            <span className="capitalize">{group.label}</span>
          </div>
        ))}
      </div>

      {/* Day/Week row */}
      <div className="flex" style={{ height: height / 2 }}>
        {viewMode === 'month' ? (
          // Show week numbers for month view
          weekGroups.length > 0 ? (
            weekGroups.map((group, index) => (
              <div
                key={`week-${index}`}
                className="flex items-center justify-center border-r text-xs text-gray-500"
                style={{ width: group.days * dayWidth }}
              >
                {group.label}
              </div>
            ))
          ) : (
            days.map((day, index) => (
              <div
                key={`day-${index}`}
                className={cn(
                  'flex items-center justify-center border-r text-xs',
                  isToday(day) && 'bg-blue-50 text-blue-600 font-medium',
                  (isSaturday(day) || isSunday(day)) && 'bg-gray-100 text-gray-400'
                )}
                style={{ width: dayWidth }}
              >
                {format(day, 'd', { locale: vi })}
              </div>
            ))
          )
        ) : viewMode === 'week' ? (
          // Show days with abbreviated name for week view
          days.map((day, index) => (
            <div
              key={`day-${index}`}
              className={cn(
                'flex flex-col items-center justify-center border-r text-xs',
                isToday(day) && 'bg-blue-50 text-blue-600 font-medium',
                (isSaturday(day) || isSunday(day)) && 'bg-gray-100 text-gray-400'
              )}
              style={{ width: dayWidth }}
            >
              <span className="text-[10px] uppercase">
                {format(day, 'EEE', { locale: vi })}
              </span>
              <span>{format(day, 'd', { locale: vi })}</span>
            </div>
          ))
        ) : (
          // Show full date for day view
          days.map((day, index) => (
            <div
              key={`day-${index}`}
              className={cn(
                'flex flex-col items-center justify-center border-r',
                isToday(day) && 'bg-blue-50 text-blue-600 font-medium',
                (isSaturday(day) || isSunday(day)) && 'bg-gray-100 text-gray-400'
              )}
              style={{ width: dayWidth }}
            >
              <span className="text-[10px] uppercase">
                {format(day, 'EEEE', { locale: vi })}
              </span>
              <span className="text-sm">{format(day, 'd/M', { locale: vi })}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TimelineHeader;
