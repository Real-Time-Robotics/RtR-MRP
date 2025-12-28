"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Truck,
  ShoppingCart,
  ClipboardList,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronDown,
  Brain,
  Factory,
  Sparkles,
  FileText,
  Activity,
  Shield,
  FileSpreadsheet,
  DollarSign,
  Calculator,
  Receipt,
  BookOpen,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  ClipboardCheck,
  Search,
  Smartphone,
  LucideIcon,
  Link2,
  Clock,
  FlaskConical,
  Lock,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

interface NavItem {
  nameKey: string;
  href: string;
  icon: LucideIcon;
  children?: { nameKey: string; href: string; icon: LucideIcon }[];
}

const navigation: NavItem[] = [
  { nameKey: "nav.dashboard", href: "/", icon: LayoutDashboard },
  { nameKey: "nav.bom", href: "/bom", icon: Package },
  { nameKey: "nav.inventory", href: "/inventory", icon: Warehouse },
  { nameKey: "nav.suppliers", href: "/suppliers", icon: Truck },
  { nameKey: "nav.orders", href: "/orders", icon: ShoppingCart },
  { nameKey: "nav.purchasing", href: "/purchasing", icon: ClipboardList },
  {
    nameKey: "nav.mrp",
    href: "/mrp",
    icon: Brain,
    children: [
      { nameKey: "nav.mrp.overview", href: "/mrp", icon: Brain },
      { nameKey: "nav.mrp.pegging", href: "/mrp/pegging", icon: Link2 },
      { nameKey: "nav.mrp.atp", href: "/mrp/atp", icon: Clock },
      { nameKey: "nav.mrp.simulation", href: "/mrp/simulation", icon: FlaskConical },
      { nameKey: "nav.mrp.exceptions", href: "/mrp/exceptions", icon: AlertTriangle },
      { nameKey: "nav.mrp.firmOrders", href: "/mrp/firm-orders", icon: Lock },
      { nameKey: "nav.mrp.multiSite", href: "/mrp/multi-site", icon: MapPin },
    ],
  },
  {
    nameKey: "nav.production",
    href: "/production",
    icon: Factory,
    children: [
      { nameKey: "nav.production.overview", href: "/production", icon: Factory },
      { nameKey: "nav.production.workCenters", href: "/production/work-centers", icon: Factory },
      { nameKey: "nav.production.routing", href: "/production/routing", icon: ClipboardList },
      { nameKey: "nav.production.schedule", href: "/production/schedule", icon: BarChart3 },
      { nameKey: "nav.production.shopFloor", href: "/production/shop-floor", icon: Factory },
      { nameKey: "nav.production.capacity", href: "/production/capacity", icon: BarChart3 },
      { nameKey: "nav.production.oee", href: "/production/oee", icon: BarChart3 },
    ],
  },
  {
    nameKey: "nav.quality",
    href: "/quality",
    icon: Shield,
    children: [
      { nameKey: "nav.quality.overview", href: "/quality", icon: Shield },
      { nameKey: "nav.quality.receiving", href: "/quality/receiving", icon: ClipboardCheck },
      { nameKey: "nav.quality.inProcess", href: "/quality/in-process", icon: CheckCircle },
      { nameKey: "nav.quality.final", href: "/quality/final", icon: CheckCircle },
      { nameKey: "nav.quality.ncr", href: "/quality/ncr", icon: AlertTriangle },
      { nameKey: "nav.quality.capa", href: "/quality/capa", icon: ClipboardCheck },
      { nameKey: "nav.quality.inspectionPlans", href: "/quality/inspection-plans", icon: Search },
      { nameKey: "nav.quality.certificates", href: "/quality/certificates", icon: FileText },
      { nameKey: "nav.quality.traceability", href: "/quality/traceability", icon: Search },
    ],
  },
  {
    nameKey: "nav.finance",
    href: "/finance",
    icon: DollarSign,
    children: [
      { nameKey: "nav.finance.overview", href: "/finance", icon: DollarSign },
      { nameKey: "nav.finance.costing", href: "/finance/costing", icon: Calculator },
      { nameKey: "nav.finance.invoicing", href: "/finance/invoicing", icon: Receipt },
      { nameKey: "nav.finance.gl", href: "/finance/gl", icon: BookOpen },
      { nameKey: "nav.finance.reports", href: "/finance/reports", icon: BarChart3 },
    ],
  },
  { nameKey: "nav.ai", href: "/ai", icon: Sparkles },
  { nameKey: "nav.excel", href: "/excel", icon: FileSpreadsheet },
  { nameKey: "nav.reports", href: "/reports", icon: FileText },
  { nameKey: "nav.activity", href: "/activity", icon: Activity },
  { nameKey: "nav.mobile", href: "/mobile", icon: Smartphone },
];

const bottomNavigation = [
  { nameKey: "nav.settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  // Auto-expand menus based on current path (only on initial load)
  useEffect(() => {
    setExpandedMenus((prev) => {
      const expanded = new Set(prev);
      navigation.forEach((item) => {
        if (item.children && item.href !== "/" && pathname.startsWith(item.href)) {
          expanded.add(item.nameKey);
        }
      });
      return expanded;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const toggleMenu = (nameKey: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(nameKey)) {
      newExpanded.delete(nameKey);
    } else {
      newExpanded.add(nameKey);
    }
    setExpandedMenus(newExpanded);
  };

  const isItemActive = (item: NavItem): boolean => {
    if (item.href === "/") {
      return pathname === "/";
    }
    if (item.children) {
      return item.children.some((child) =>
        child.href === item.href
          ? pathname === child.href
          : pathname.startsWith(child.href) && child.href !== item.href
      ) || pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  const isChildActive = (href: string, parentHref: string): boolean => {
    if (href === parentHref) {
      return pathname === href;
    }
    return pathname === href || (pathname.startsWith(href) && href !== parentHref);
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = isItemActive(item);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.has(item.nameKey);
    const itemName = t(item.nameKey);

    if (hasChildren) {
      return (
        <div key={item.nameKey}>
          <button
            onClick={() => toggleMenu(item.nameKey)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            )}
            title={collapsed ? itemName : undefined}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{itemName}</span>}
            </div>
            {!collapsed && (
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            )}
          </button>
          {!collapsed && isExpanded && (
            <div className="mt-1 ml-4 space-y-1 border-l border-gray-700 pl-3">
              {item.children!.map((child) => {
                const childActive = isChildActive(child.href, item.href);
                const childName = t(child.nameKey);
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      childActive
                        ? "bg-primary text-white"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    )}
                  >
                    <child.icon className="h-4 w-4 shrink-0" />
                    <span>{childName}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.nameKey}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-white"
            : "text-gray-400 hover:bg-gray-800 hover:text-white"
        )}
        title={collapsed ? itemName : undefined}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span>{itemName}</span>}
      </Link>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-gray-900 text-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-800">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">RTR</span>
            </div>
            <span className="font-semibold text-lg">MRP System</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-white hover:bg-gray-800"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft
            className={cn(
              "h-5 w-5 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {navigation.map((item) => renderNavItem(item))}
        </nav>
      </ScrollArea>

      {/* Bottom Navigation */}
      <div className="border-t border-gray-800 p-2 space-y-1">
        {bottomNavigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const itemName = t(item.nameKey);
          return (
            <Link
              key={item.nameKey}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
              title={collapsed ? itemName : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{itemName}</span>}
            </Link>
          );
        })}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          title={collapsed ? t("auth.logout") : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>{t("auth.logout")}</span>}
        </button>
      </div>
    </div>
  );
}
