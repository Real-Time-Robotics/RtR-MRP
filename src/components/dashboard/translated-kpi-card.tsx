"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertTriangle, ClipboardList, Bell, LucideIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  package: Package,
  "alert-triangle": AlertTriangle,
  "clipboard-list": ClipboardList,
  bell: Bell,
};

interface TranslatedKPICardProps {
  titleKey: string;
  value: number | string;
  subtitleKey?: string;
  subtitle?: string;
  iconName: string;
  variant?: "default" | "success" | "warning" | "danger";
}

export function TranslatedKPICard({
  titleKey,
  value,
  subtitleKey,
  subtitle,
  iconName,
  variant = "default",
}: TranslatedKPICardProps) {
  const { t } = useLanguage();
  const Icon = iconMap[iconName] || Package;

  const variantClasses = {
    default: "bg-blue-100 text-blue-600",
    success: "bg-green-100 text-green-600",
    warning: "bg-amber-100 text-amber-600",
    danger: "bg-red-100 text-red-600",
  };

  const valueClasses = {
    default: "",
    success: "text-green-600",
    warning: "text-amber-600",
    danger: "text-red-600",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t(titleKey)}</p>
            <p className={cn("text-2xl font-bold", valueClasses[variant])}>
              {value}
            </p>
            {(subtitleKey || subtitle) && (
              <p className="text-xs text-muted-foreground">
                {subtitleKey ? t(subtitleKey) : subtitle}
              </p>
            )}
          </div>
          <div
            className={cn(
              "h-12 w-12 rounded-lg flex items-center justify-center",
              variantClasses[variant]
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
