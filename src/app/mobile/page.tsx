"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { cn } from "@/lib/utils";
import {
  Scan,
  Package,
  Truck,
  ClipboardList,
  Factory,
  CheckCircle,
  ArrowRightLeft,
  Calculator,
  History,
} from "lucide-react";
import { haptic } from "@/lib/mobile/haptics";

interface QuickAction {
  name: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    name: "Scan",
    description: "Scan barcode or QR code",
    href: "/mobile/scan",
    icon: Scan,
    color: "bg-blue-500",
  },
  {
    name: "Inventory",
    description: "View & adjust inventory",
    href: "/mobile/inventory",
    icon: Package,
    color: "bg-green-500",
  },
  {
    name: "Receiving",
    description: "Receive PO items",
    href: "/mobile/receiving",
    icon: Truck,
    color: "bg-orange-500",
  },
  {
    name: "Picking",
    description: "Pick sales orders",
    href: "/mobile/picking",
    icon: ClipboardList,
    color: "bg-purple-500",
  },
  {
    name: "Work Orders",
    description: "View & update WOs",
    href: "/mobile/work-orders",
    icon: Factory,
    color: "bg-indigo-500",
  },
  {
    name: "Quality",
    description: "Inspections & checks",
    href: "/mobile/quality",
    icon: CheckCircle,
    color: "bg-red-500",
  },
  {
    name: "Transfer",
    description: "Move inventory",
    href: "/mobile/inventory/transfer",
    icon: ArrowRightLeft,
    color: "bg-cyan-500",
  },
  {
    name: "Cycle Count",
    description: "Count inventory",
    href: "/mobile/inventory/count",
    icon: Calculator,
    color: "bg-yellow-500",
  },
];

export default function MobileHomePage() {
  const handleActionClick = () => {
    haptic("selection");
  };

  return (
    <div className="min-h-screen">
      <MobileHeader
        title="RTR MRP Mobile"
        subtitle="Shop Floor Operations"
        showBack
        backHref="/home"
        menuItems={[
          { label: "Settings", onClick: () => window.location.href = "/mobile/profile" },
          { label: "Scan History", onClick: () => window.location.href = "/mobile/scan/history" },
          { label: "Sync Now", onClick: () => {} },
        ]}
      />

      <div className="p-4 space-y-6">
        {/* Welcome section */}
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-white">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold">Welcome!</h2>
            <p className="text-sm text-white/80 mt-1">
              Tap an action below to get started, or use the scan button to
              quickly look up parts and locations.
            </p>
          </CardContent>
        </Card>

        {/* Quick actions grid */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            QUICK ACTIONS
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                href={action.href}
                onClick={handleActionClick}
              >
                <Card className="h-full hover:shadow-md transition-shadow active:scale-95">
                  <CardContent className="p-4">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                        action.color
                      )}
                    >
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="font-medium">{action.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {action.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              RECENT ACTIVITY
            </h3>
            <Link
              href="/mobile/scan/history"
              className="text-xs text-primary font-medium"
            >
              View All
            </Link>
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-center text-muted-foreground py-6">
                <History className="h-5 w-5 mr-2" />
                <span className="text-sm">No recent activity</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
