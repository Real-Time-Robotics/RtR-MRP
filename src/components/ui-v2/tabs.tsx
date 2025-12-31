'use client';

import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// TABS COMPONENT
// Accessible tabs with multiple variants and animations
// =============================================================================

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
  content?: React.ReactNode;
}

export interface TabsProps {
  /** Tab items */
  items?: TabItem[];
  /** Active tab id */
  activeTab?: string;
  /** Default active tab */
  defaultTab?: string;
  /** Tab change handler */
  onChange?: (tabId: string) => void;
  /** Tabs variant */
  variant?: 'line' | 'pills' | 'enclosed' | 'soft';
  /** Tabs size */
  size?: 'sm' | 'md' | 'lg';
  /** Full width tabs */
  fullWidth?: boolean;
  /** Tabs alignment */
  align?: 'start' | 'center' | 'end';
  /** Vertical tabs */
  vertical?: boolean;
  /** Show animated indicator */
  animated?: boolean;
  /** Custom class */
  className?: string;
  /** Children (for compound pattern) */
  children?: React.ReactNode;
}

// Context for compound pattern
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
  variant: string;
  size: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tab components must be used within a Tabs component');
  }
  return context;
};

// Size styles
const tabSizes = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-5 py-2.5',
};

// Variant styles for tab items
const getTabStyles = (variant: string, isActive: boolean, disabled: boolean) => {
  const base = 'relative flex items-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2';
  
  if (disabled) {
    return cn(base, 'opacity-50 cursor-not-allowed');
  }

  switch (variant) {
    case 'line':
      return cn(
        base,
        'border-b-2 -mb-px',
        isActive
          ? 'border-primary-600 text-primary-600'
          : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
      );
    case 'pills':
      return cn(
        base,
        'rounded-lg',
        isActive
          ? 'bg-primary-600 text-white shadow-sm'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      );
    case 'enclosed':
      return cn(
        base,
        'border rounded-t-lg -mb-px',
        isActive
          ? 'bg-white border-slate-200 border-b-white text-slate-900'
          : 'bg-slate-50 border-transparent text-slate-600 hover:text-slate-900'
      );
    case 'soft':
      return cn(
        base,
        'rounded-lg',
        isActive
          ? 'bg-primary-100 text-primary-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      );
    default:
      return base;
  }
};

// Tabs Container
const Tabs: React.FC<TabsProps> = ({
  items,
  activeTab: controlledActiveTab,
  defaultTab,
  onChange,
  variant = 'line',
  size = 'md',
  fullWidth = false,
  align = 'start',
  vertical = false,
  animated = true,
  className,
  children,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(
    defaultTab || items?.[0]?.id || ''
  );
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const activeTab = controlledActiveTab ?? internalActiveTab;

  const handleTabChange = (tabId: string) => {
    if (!controlledActiveTab) {
      setInternalActiveTab(tabId);
    }
    onChange?.(tabId);
  };

  // Update indicator position for line variant
  useEffect(() => {
    if (variant !== 'line' || !animated) return;

    const activeButton = tabRefs.current.get(activeTab);
    if (activeButton && tabsRef.current) {
      const tabsRect = tabsRef.current.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      setIndicatorStyle({
        left: buttonRect.left - tabsRect.left,
        width: buttonRect.width,
      });
    }
  }, [activeTab, variant, animated]);

  // Alignment classes
  const alignClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
  };

  // Render with items prop
  if (items) {
    return (
      <div className={className}>
        {/* Tab List */}
        <div
          ref={tabsRef}
          role="tablist"
          className={cn(
            'relative flex',
            variant === 'line' && 'border-b border-slate-200',
            variant === 'enclosed' && 'border-b border-slate-200',
            vertical ? 'flex-col' : alignClasses[align],
            fullWidth && 'w-full',
            variant === 'pills' && 'gap-1 p-1 bg-slate-100 rounded-lg',
            variant === 'soft' && 'gap-1'
          )}
        >
          {items.map((item) => (
            <button
              key={item.id}
              ref={(el) => {
                if (el) tabRefs.current.set(item.id, el);
              }}
              role="tab"
              aria-selected={activeTab === item.id}
              aria-controls={`tabpanel-${item.id}`}
              tabIndex={activeTab === item.id ? 0 : -1}
              onClick={() => !item.disabled && handleTabChange(item.id)}
              className={cn(
                getTabStyles(variant, activeTab === item.id, !!item.disabled),
                tabSizes[size],
                fullWidth && 'flex-1 justify-center'
              )}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 text-xs font-medium rounded-full',
                    activeTab === item.id
                      ? variant === 'pills'
                        ? 'bg-white/20 text-white'
                        : 'bg-primary-100 text-primary-700'
                      : 'bg-slate-200 text-slate-600'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          {/* Animated indicator for line variant */}
          {variant === 'line' && animated && (
            <div
              className="absolute bottom-0 h-0.5 bg-primary-600 transition-all duration-200"
              style={indicatorStyle}
            />
          )}
        </div>

        {/* Tab Panels */}
        <div className="mt-4">
          {items.map((item) => (
            <div
              key={item.id}
              id={`tabpanel-${item.id}`}
              role="tabpanel"
              aria-labelledby={item.id}
              hidden={activeTab !== item.id}
              className={cn(
                activeTab === item.id && 'animate-fade-in'
              )}
            >
              {item.content}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render with compound pattern
  return (
    <TabsContext.Provider
      value={{
        activeTab,
        setActiveTab: handleTabChange,
        variant,
        size,
      }}
    >
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

// Tab List (for compound pattern)
interface TabListProps {
  children: React.ReactNode;
  className?: string;
}

const TabList: React.FC<TabListProps> = ({ children, className }) => {
  const { variant } = useTabsContext();

  return (
    <div
      role="tablist"
      className={cn(
        'flex',
        variant === 'line' && 'border-b border-slate-200',
        variant === 'pills' && 'gap-1 p-1 bg-slate-100 rounded-lg',
        variant === 'soft' && 'gap-1',
        className
      )}
    >
      {children}
    </div>
  );
};

// Tab (for compound pattern)
interface TabProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

const Tab: React.FC<TabProps> = ({ id, children, disabled = false, className }) => {
  const { activeTab, setActiveTab, variant, size } = useTabsContext();
  const isActive = activeTab === id;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${id}`}
      tabIndex={isActive ? 0 : -1}
      onClick={() => !disabled && setActiveTab(id)}
      className={cn(
        getTabStyles(variant, isActive, disabled),
        tabSizes[size as keyof typeof tabSizes],
        className
      )}
    >
      {children}
    </button>
  );
};

// Tab Panel (for compound pattern)
interface TabPanelProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

const TabPanel: React.FC<TabPanelProps> = ({ id, children, className }) => {
  const { activeTab } = useTabsContext();
  const isActive = activeTab === id;

  if (!isActive) return null;

  return (
    <div
      id={`tabpanel-${id}`}
      role="tabpanel"
      aria-labelledby={id}
      className={cn('animate-fade-in', className)}
    >
      {children}
    </div>
  );
};

// Tab Panels Container
interface TabPanelsProps {
  children: React.ReactNode;
  className?: string;
}

const TabPanels: React.FC<TabPanelsProps> = ({ children, className }) => {
  return <div className={cn('mt-4', className)}>{children}</div>;
};

Tabs.displayName = 'Tabs';
TabList.displayName = 'TabList';
Tab.displayName = 'Tab';
TabPanel.displayName = 'TabPanel';
TabPanels.displayName = 'TabPanels';

// =============================================================================
// EXPORTS
// =============================================================================

export { Tabs, TabList, Tab, TabPanel, TabPanels };
export default Tabs;
