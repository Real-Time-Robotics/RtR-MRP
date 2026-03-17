"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Warehouse,
  Building2,
  Users,
  Package,
  ShoppingBag,
  Link2,
  Layers,
  BoxesIcon,
  Upload,
  Trash2,
  CheckCircle2,
  Circle,
  Lock,
  Loader2,
  Sparkles,
} from "lucide-react";
import { SmartUploadDialog } from "@/components/data-setup/smart-upload-dialog";

const ImportWizard = dynamic(
  () =>
    import("@/components/excel/import-wizard").then((mod) => mod.ImportWizard),
  { loading: () => <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin" /></div> }
);

// Entity definitions with dependency info
interface EntityDef {
  key: string;
  label: string;
  labelVi: string;
  importType: string;
  icon: React.ReactNode;
  deps: string[]; // keys of entities this depends on
}

const TIERS: { label: string; labelVi: string; description: string; entities: EntityDef[] }[] = [
  {
    label: "Tier 1 — Foundation",
    labelVi: "Tier 1 — Nền tảng",
    description: "Independent entities, no dependencies",
    entities: [
      { key: "warehouses", label: "Warehouses", labelVi: "Kho hàng", importType: "warehouses", icon: <Warehouse className="w-4 h-4" />, deps: [] },
      { key: "suppliers", label: "Suppliers", labelVi: "Nhà cung cấp", importType: "suppliers", icon: <Building2 className="w-4 h-4" />, deps: [] },
      { key: "customers", label: "Customers", labelVi: "Khách hàng", importType: "customers", icon: <Users className="w-4 h-4" />, deps: [] },
    ],
  },
  {
    label: "Tier 2 — Core",
    labelVi: "Tier 2 — Dữ liệu chính",
    description: "Depends on Tier 1",
    entities: [
      { key: "parts", label: "Parts", labelVi: "Vật tư / Linh kiện", importType: "parts", icon: <Package className="w-4 h-4" />, deps: [] },
      { key: "products", label: "Products", labelVi: "Sản phẩm", importType: "products", icon: <ShoppingBag className="w-4 h-4" />, deps: [] },
    ],
  },
  {
    label: "Tier 3 — Relations",
    labelVi: "Tier 3 — Quan hệ & Tồn kho",
    description: "Depends on Tier 1 + Tier 2",
    entities: [
      { key: "partSuppliers", label: "Part-Suppliers", labelVi: "NCC - Vật tư", importType: "part-suppliers", icon: <Link2 className="w-4 h-4" />, deps: ["parts", "suppliers"] },
      { key: "bom", label: "BOM", labelVi: "Định mức vật tư", importType: "bom", icon: <Layers className="w-4 h-4" />, deps: ["parts", "products"] },
      { key: "inventory", label: "Inventory", labelVi: "Tồn kho", importType: "inventory", icon: <BoxesIcon className="w-4 h-4" />, deps: ["parts", "warehouses"] },
    ],
  },
];

interface EntityCounts {
  warehouses: number;
  suppliers: number;
  customers: number;
  parts: number;
  products: number;
  partSuppliers: number;
  bom: number;
  inventory: number;
}

export default function DataSetupPage() {
  const [counts, setCounts] = useState<EntityCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImport, setActiveImport] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetInput, setResetInput] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showSmartUpload, setShowSmartUpload] = useState(false);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/data-setup/status?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        setCounts(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const handleReset = async () => {
    if (resetInput !== "RESET") return;
    setResetting(true);
    try {
      const res = await fetch("/api/data-setup/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET" }),
      });
      if (res.ok) {
        setShowResetConfirm(false);
        setResetInput("");
        await fetchCounts();
      }
    } catch {
      // ignore
    } finally {
      setResetting(false);
    }
  };

  const getCount = (key: string): number => {
    if (!counts) return 0;
    return (counts as unknown as Record<string, number>)[key] ?? 0;
  };

  const isLocked = (entity: EntityDef): boolean => {
    if (!counts) return true;
    return entity.deps.some((dep) => getCount(dep) === 0);
  };

  const getStatus = (entity: EntityDef): "done" | "empty" | "locked" => {
    if (isLocked(entity)) return "locked";
    return getCount(entity.key) > 0 ? "done" : "empty";
  };

  const statusIcon = (status: "done" | "empty" | "locked") => {
    switch (status) {
      case "done":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "empty":
        return <Circle className="w-4 h-4 text-gray-400" />;
      case "locked":
        return <Lock className="w-4 h-4 text-gray-300" />;
    }
  };

  const totalEntities = TIERS.flatMap((t) => t.entities).length;
  const doneEntities = TIERS.flatMap((t) => t.entities).filter(
    (e) => getCount(e.key) > 0
  ).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="MASTER DATA IMPORT CENTER"
        description={
          loading
            ? "Loading..."
            : `${doneEntities}/${totalEntities} entities imported`
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSmartUpload(true)}
              className="border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/20"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Smart Upload
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Reset Database
            </Button>
          </div>
        }
      />

      {/* Progress bar */}
      {!loading && counts && (
        <div className="mb-6">
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(doneEntities / totalEntities) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Tier cards */}
      <div className="space-y-6">
        {TIERS.map((tier, tierIdx) => (
          <div
            key={tierIdx}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            {/* Tier header */}
            <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-semibold font-mono tracking-wider text-gray-700 dark:text-gray-300">
                {tier.label}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{tier.description}</p>
            </div>

            {/* Entity rows */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {tier.entities.map((entity) => {
                const status = getStatus(entity);
                const count = getCount(entity.key);

                return (
                  <div
                    key={entity.key}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    {/* Status icon */}
                    {statusIcon(status)}

                    {/* Icon */}
                    <span className="text-gray-500 dark:text-gray-400">
                      {entity.icon}
                    </span>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {entity.labelVi}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        {entity.label}
                      </span>
                    </div>

                    {/* Count badge */}
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded ${
                        count > 0
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                      }`}
                    >
                      {loading ? "..." : count}
                    </span>

                    {/* Import button */}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={status === "locked" || loading}
                      onClick={() => setActiveImport(entity.importType)}
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      Import
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Import Dialog */}
      <Dialog
        open={!!activeImport}
        onOpenChange={(open) => {
          if (!open) setActiveImport(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Data</DialogTitle>
          </DialogHeader>
          {activeImport && (
            <ImportWizard
              defaultEntityType={activeImport}
              onSuccess={() => {
                setActiveImport(null);
                fetchCounts();
              }}
              onClose={() => setActiveImport(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Smart Upload Dialog */}
      <SmartUploadDialog
        open={showSmartUpload}
        onOpenChange={setShowSmartUpload}
        onSuccess={() => fetchCounts()}
      />

      {/* Reset Confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ALL master data and transactions.
              User accounts and system settings will be preserved.
              <br />
              <br />
              Type <strong>RESET</strong> to confirm:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            type="text"
            value={resetInput}
            onChange={(e) => setResetInput(e.target.value)}
            placeholder='Type "RESET" to confirm'
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm font-mono"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResetInput("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={resetInput !== "RESET" || resetting}
              className="bg-red-600 hover:bg-red-700"
            >
              {resetting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
