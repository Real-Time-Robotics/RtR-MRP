"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Scan,
  Package,
  ClipboardList,
  User,
  LucideIcon,
} from "lucide-react";
import { haptic } from "@/lib/mobile/haptics";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { name: "Home", href: "/mobile", icon: Home },
  { name: "Scan", href: "/mobile/scan", icon: Scan },
  { name: "Inventory", href: "/mobile/inventory", icon: Package },
  { name: "Tasks", href: "/mobile/tasks", icon: ClipboardList },
  { name: "Profile", href: "/mobile/profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  const handleNavClick = () => {
    haptic("selection");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-900 border-t border-neutral-800 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive =
            item.href === "/mobile"
              ? pathname === "/mobile"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              <item.icon className={cn("h-6 w-6", isActive && "fill-primary/20")} />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
