"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

interface FlagConfig {
  key: string;
  titleKey: string;
  descKey: string;
  offDescKey: string;
  onDescKey: string;
  infoKey: string;
  dependsOn?: string;
  dependsLabel?: string;
}

const FLAG_CONFIGS: FlagConfig[] = [
  {
    key: "use_wip_warehouse",
    titleKey: "whSettings.wipTitle",
    descKey: "whSettings.wipDesc",
    offDescKey: "whSettings.wipOff",
    onDescKey: "whSettings.wipOn",
    infoKey: "whSettings.wipInfo",
  },
  {
    key: "use_fg_warehouse",
    titleKey: "whSettings.fgTitle",
    descKey: "whSettings.fgDesc",
    offDescKey: "whSettings.fgOff",
    onDescKey: "whSettings.fgOn",
    infoKey: "whSettings.fgInfo",
    dependsOn: "use_wip_warehouse",
    dependsLabel: "WIP",
  },
  {
    key: "use_ship_warehouse",
    titleKey: "whSettings.shipTitle",
    descKey: "whSettings.shipDesc",
    offDescKey: "whSettings.shipOff",
    onDescKey: "whSettings.shipOn",
    infoKey: "whSettings.shipInfo",
    dependsOn: "use_fg_warehouse",
    dependsLabel: "FG",
  },
];

function getFlowDescription(flags: Record<string, boolean>): string {
  if (flags.use_ship_warehouse) {
    return "PO → RECEIVING → QC → MAIN → WIP → FG → SHIP → Customer";
  }
  if (flags.use_fg_warehouse) {
    return "PO → RECEIVING → QC → MAIN → WIP → FG → Ship";
  }
  if (flags.use_wip_warehouse) {
    return "PO → RECEIVING → QC → MAIN → WIP → MAIN → Ship";
  }
  return "PO → RECEIVING → QC → MAIN → Ship";
}

export default function WarehouseSettingsPage() {
  const { t } = useLanguage();
  const [flags, setFlags] = useState<Record<string, boolean>>({
    use_wip_warehouse: false,
    use_fg_warehouse: false,
    use_ship_warehouse: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/feature-flags")
      .then((res) => res.json())
      .then((data) => {
        if (data.flags) setFlags(data.flags);
        setLoading(false);
      })
      .catch(() => {
        setError(t("whSettings.errorLoading"));
        setLoading(false);
      });
  }, []);

  async function toggleFlag(key: string, value: boolean) {
    setSaving(key);
    setError(null);
    try {
      const res = await fetch("/api/settings/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: value.toString() }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setFlags((prev) => ({ ...prev, [key]: value }));
    } catch {
      setError(t("whSettings.errorSaving"));
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("whSettings.title")} description={t("whSettings.description")} />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("whSettings.title")} description={t("whSettings.description")} />

      {/* Warning banner */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-800 dark:text-amber-300">{t("whSettings.warningTitle")}</p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">{t("whSettings.warningDesc")}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Flag Cards */}
      {FLAG_CONFIGS.map((config) => {
        const isEnabled = flags[config.key];
        const isDependencyMet = !config.dependsOn || flags[config.dependsOn];
        const isSaving = saving === config.key;

        return (
          <Card key={config.key} className="border-gray-200 dark:border-mrp-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{t(config.titleKey)}</CardTitle>
                  <CardDescription>{t(config.descKey)}</CardDescription>
                </div>
                <button
                  onClick={() => toggleFlag(config.key, !isEnabled)}
                  disabled={isSaving || !isDependencyMet}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    isEnabled
                      ? "bg-blue-600"
                      : "bg-gray-300 dark:bg-gray-600"
                  } ${(!isDependencyMet || isSaving) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p>
                  <strong>{t("whSettings.whenOff")}:</strong> {t(config.offDescKey)}
                </p>
                <p>
                  <strong>{t("whSettings.whenOn")}:</strong> {t(config.onDescKey)}
                </p>
                {!isDependencyMet && config.dependsLabel && (
                  <p className="text-amber-600 dark:text-amber-400">
                    {t("whSettings.requiresDependency").replace("{dep}", config.dependsLabel)}
                  </p>
                )}
                <div className="flex items-start gap-2 mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-800 dark:text-blue-300 text-xs">{t(config.infoKey)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Current flow status */}
      <Card className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-mrp-border">
        <CardHeader>
          <CardTitle className="text-base">{t("whSettings.currentFlow")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-sm flex flex-wrap gap-1">
            {getFlowDescription(flags).split(" → ").map((step, i, arr) => (
              <span key={i} className="flex items-center gap-1">
                <Badge
                  variant="secondary"
                  className={
                    (step === "WIP" && flags.use_wip_warehouse) ||
                    (step === "FG" && flags.use_fg_warehouse) ||
                    (step === "SHIP" && flags.use_ship_warehouse)
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                      : ""
                  }
                >
                  {step}
                </Badge>
                {i < arr.length - 1 && <span className="text-gray-400">→</span>}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
