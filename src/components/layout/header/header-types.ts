// =============================================================================
// HEADER SHARED TYPES
// =============================================================================

import React from 'react';

export interface MegaMenuItem {
  id: string;
  labelKey: string;
  descriptionKey?: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  badge?: string;
  isNew?: boolean;
}

export interface MegaMenuSection {
  titleKey: string;
  items: MegaMenuItem[];
}

export interface NavTab {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
  sections: MegaMenuSection[];
  quickActions?: MegaMenuItem[];
}
