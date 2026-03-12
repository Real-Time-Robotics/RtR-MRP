// src/lib/commands/command-registry.ts
// Command registry for Command Palette (Cmd+K)

import {
  Home, Package, ShoppingCart, Warehouse, BarChart3, Wrench,
  Rocket, Plus, AlertTriangle, FileText, Bot,
} from 'lucide-react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

type LucideIcon = React.ComponentType<{ className?: string }>;

export interface Command {
  id: string;
  name: string;
  description?: string;
  icon?: LucideIcon;
  shortcut?: string;
  group: 'recent' | 'actions' | 'navigation' | 'ai';
  action: () => void | Promise<void>;
  keywords?: string[];
}

export function createNavigationCommands(router: AppRouterInstance): Command[] {
  return [
    {
      id: 'nav-dashboard',
      name: 'Dashboard',
      icon: Home,
      group: 'navigation',
      keywords: ['home', 'trang chu'],
      action: () => router.push('/'),
    },
    {
      id: 'nav-purchasing',
      name: 'Purchasing',
      description: 'Quan ly mua hang',
      icon: Package,
      group: 'navigation',
      keywords: ['mua hang', 'po', 'purchase'],
      action: () => router.push('/purchasing'),
    },
    {
      id: 'nav-sales',
      name: 'Sales Orders',
      description: 'Quan ly ban hang',
      icon: ShoppingCart,
      group: 'navigation',
      keywords: ['ban hang', 'so', 'don hang', 'orders'],
      action: () => router.push('/orders'),
    },
    {
      id: 'nav-inventory',
      name: 'Inventory',
      description: 'Quan ly ton kho',
      icon: Warehouse,
      group: 'navigation',
      keywords: ['ton kho', 'kho', 'warehouse'],
      action: () => router.push('/inventory'),
    },
    {
      id: 'nav-mrp',
      name: 'MRP',
      description: 'Hoach dinh san xuat',
      icon: BarChart3,
      group: 'navigation',
      keywords: ['mrp', 'hoach dinh', 'planning'],
      action: () => router.push('/mrp'),
    },
    {
      id: 'nav-production',
      name: 'Production',
      description: 'Quan ly san xuat',
      icon: Wrench,
      group: 'navigation',
      keywords: ['san xuat', 'work order', 'wo'],
      action: () => router.push('/production'),
    },
    {
      id: 'nav-activity',
      name: 'Activity Log',
      description: 'Lich su hoat dong',
      icon: FileText,
      group: 'navigation',
      keywords: ['activity', 'lich su', 'hoat dong'],
      action: () => router.push('/activity'),
    },
  ];
}

export function createActionCommands(router: AppRouterInstance): Command[] {
  return [
    {
      id: 'action-run-mrp',
      name: 'Chay MRP',
      description: 'Khoi chay MRP moi',
      icon: Rocket,
      group: 'actions',
      keywords: ['run mrp', 'chay', 'mrp'],
      action: () => router.push('/mrp'),
    },
    {
      id: 'action-new-po',
      name: 'Tao PO moi',
      description: 'Tao Purchase Order moi',
      icon: Plus,
      group: 'actions',
      keywords: ['tao po', 'new po', 'mua hang moi'],
      action: () => router.push('/purchasing/new'),
    },
    {
      id: 'action-new-so',
      name: 'Tao SO moi',
      description: 'Tao Sales Order moi',
      icon: Plus,
      group: 'actions',
      keywords: ['tao so', 'new so', 'don hang moi'],
      action: () => router.push('/orders/new'),
    },
    {
      id: 'action-low-stock',
      name: 'Xem ton kho thap',
      description: 'Danh sach items duoi safety stock',
      icon: AlertTriangle,
      group: 'actions',
      keywords: ['low stock', 'ton thap', 'canh bao'],
      action: () => router.push('/inventory?filter=low-stock'),
    },
  ];
}

export function createAICommand(openAIAssistant: () => void): Command {
  return {
    id: 'ai-assistant',
    name: 'Hoi AI',
    description: '"Toi dang lam gi do?"',
    icon: Bot,
    shortcut: 'Cmd+J',
    group: 'ai',
    keywords: ['ai', 'tro ly', 'hoi', 'assistant'],
    action: openAIAssistant,
  };
}
