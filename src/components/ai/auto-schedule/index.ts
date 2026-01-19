// =============================================================================
// AUTO-SCHEDULE COMPONENTS - INDEX
// =============================================================================

// Main Gantt Chart
export { GanttChart } from './gantt-chart';
export type {
  GanttChartProps,
  GanttWorkOrder,
  GanttWorkCenter,
  GanttConflict,
  ViewMode,
} from './gantt-chart';

// Work Order Bar
export { WorkOrderBar } from './work-order-bar';
export type { WorkOrderBarProps, WorkOrderBarData } from './work-order-bar';

// Timeline Header
export { TimelineHeader } from './timeline-header';
export type { TimelineHeaderProps } from './timeline-header';

// Capacity Bar
export { CapacityBar, CapacityOverview } from './capacity-bar';
export type { CapacityBarProps, CapacityOverviewProps } from './capacity-bar';

// Conflict Alert
export { ConflictAlert, ConflictList } from './conflict-alert';
export type {
  ConflictAlertProps,
  ConflictAlertData,
  ConflictListProps,
  ConflictSeverity,
} from './conflict-alert';

// Schedule Suggestion
export { ScheduleSuggestion, SuggestionList } from './schedule-suggestion';
export type {
  ScheduleSuggestionProps,
  ScheduleSuggestionData,
  ScheduleChange,
  SuggestionListProps,
} from './schedule-suggestion';
