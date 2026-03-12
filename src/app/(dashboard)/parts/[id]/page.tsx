"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAIContextSync } from "@/hooks/use-ai-context-sync";
import Link from "next/link";
import dynamic from 'next/dynamic';

const PartFormDialog = dynamic(
  () => import('@/components/parts/part-form-dialog').then(m => ({ default: m.PartFormDialog })),
  { ssr: false, loading: () => null }
);
import {
  ArrowLeft,
  Edit2,
  Package,
  Truck,
  Shield,
  FileText,
  History,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Clock,
  Boxes,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntityDiscussions } from "@/components/discussions/entity-discussions";
import { EntityAuditHistory } from "@/components/audit/entity-audit-history";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { clientLogger } from '@/lib/client-logger';
import { EntityTooltip } from '@/components/entity-tooltip';

interface Part {
  id: string;
  partNumber: string;
  name: string;
  description: string | null;
  category: string;
  subCategory: string | null;
  partType: string | null;
  unit: string;
  unitCost: number;

  // Physical
  weightKg: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  volumeCm3: number | null;
  color: string | null;
  material: string | null;

  // Procurement
  makeOrBuy: string;
  procurementType: string;
  buyerCode: string | null;
  moq: number;
  orderMultiple: number;
  standardPack: number;
  leadTimeDays: number;

  // Inventory
  minStockLevel: number;
  reorderPoint: number;
  maxStock: number | null;
  safetyStock: number;
  isCritical: boolean;

  // Compliance
  countryOfOrigin: string | null;
  hsCode: string | null;
  eccn: string | null;
  ndaaCompliant: boolean;
  itarControlled: boolean;

  // Quality
  lotControl: boolean;
  serialControl: boolean;
  shelfLifeDays: number | null;
  inspectionRequired: boolean;
  inspectionPlan: string | null;
  aqlLevel: string | null;
  certificateRequired: boolean;
  rohsCompliant: boolean;
  reachCompliant: boolean;

  // Engineering
  revision: string;
  revisionDate: string | null;
  drawingNumber: string | null;
  drawingUrl: string | null;
  datasheetUrl: string | null;
  specDocument: string | null;
  manufacturerPn: string | null;
  manufacturer: string | null;
  lifecycleStatus: string;
  effectivityDate: string | null;
  obsoleteDate: string | null;

  // Costing
  standardCost: number | null;
  averageCost: number | null;
  landedCost: number | null;
  freightPercent: number | null;
  dutyPercent: number | null;
  overheadPercent: number | null;
  priceBreakQty1: number | null;
  priceBreakCost1: number | null;
  priceBreakQty2: number | null;
  priceBreakCost2: number | null;
  priceBreakQty3: number | null;
  priceBreakCost3: number | null;

  // Planning (nested from API)
  planning?: {
    moq?: number;
    orderMultiple?: number;
    standardPack?: number;
    minStockLevel?: number;
    reorderPoint?: number;
    maxStock?: number | null;
    safetyStock?: number;
  };

  supplier: { id: string; name: string } | null;
  partSuppliers: Array<{
    id: string;
    supplierId: string;
    isPreferred: boolean;
    supplier: { id: string; code: string; name: string };
  }>;
  alternates: Array<{
    id: string;
    alternateType: string;
    priority: number;
    approved: boolean;
    alternatePart: { id: string; partNumber: string; name: string };
  }>;
  documents: Array<{
    id: string;
    documentType: string;
    title: string;
    revision: string;
    url: string;
  }>;
  certifications: Array<{
    id: string;
    certificationType: string;
    certificateNumber: string | null;
    issuingBody: string | null;
    expiryDate: string | null;
    verified: boolean;
  }>;
  revisions: Array<{
    id: string;
    revision: string;
    previousRevision: string | null;
    revisionDate: string;
    changeType: string | null;
    changeDescription: string | null;
    changedBy: string;
  }>;
  costHistory: Array<{
    id: string;
    effectiveDate: string;
    costType: string;
    unitCost: number;
    currency: string;
  }>;
  inventory: Array<{
    id: string;
    quantity: number;
    reservedQty: number;
    warehouse: { id: string; name: string };
  }>;
}

const LIFECYCLE_COLORS: Record<string, string> = {
  DEVELOPMENT: "bg-purple-100 text-purple-800",
  PROTOTYPE: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-green-100 text-green-800",
  PHASE_OUT: "bg-yellow-100 text-yellow-800",
  OBSOLETE: "bg-red-100 text-red-800",
  EOL: "bg-gray-100 text-gray-800",
};

function formatCurrency(amount: number | null) {
  if (amount === null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(date: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className="text-muted-foreground flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className="font-medium">{value || "-"}</span>
    </div>
  );
}

interface AIRecommendation {
  partId: string;
  partSku: string;
  current: {
    safetyStock: number;
    reorderPoint: number;
  };
  recommended: {
    safetyStock: number;
    reorderPoint: number;
  };
  delta: {
    safetyStock: number;
    reorderPoint: number;
  };
  confidence: number;
  factors: {
    demandVariability: number;
    leadTimeVariability: number;
    serviceLevel: number;
    holidayBuffer: number;
  };
  reasoning: string[];
}

export default function PartDetailPage() {
  const params = useParams();
  const [part, setPart] = useState<Part | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // AI Recommendations state
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const fetchPart = useCallback(async () => {
    try {
      const res = await fetch(`/api/parts/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setPart(data);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch part:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchPart();
  }, [fetchPart]);

  // Fetch AI recommendations
  const fetchAIRecommendations = useCallback(async () => {
    if (!params.id) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/ai/forecast/mrp-integration?action=recommendation&partId=${params.id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setAiRecommendation(data.data);
      } else {
        setAiError(data.error || "Failed to fetch AI recommendations");
      }
    } catch (error) {
      clientLogger.error("Failed to fetch AI recommendations:", error);
      setAiError("Failed to connect to AI service");
    } finally {
      setAiLoading(false);
    }
  }, [params.id]);

  // Apply AI recommendations
  const applyRecommendations = async () => {
    if (!params.id || !aiRecommendation) return;
    setApplying(true);
    try {
      const res = await fetch("/api/ai/forecast/mrp-integration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          partIds: [params.id],
          options: {
            updateSafetyStock: true,
            updateReorderPoint: true,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh part data and recommendations
        await fetchPart();
        await fetchAIRecommendations();
      } else {
        setAiError(data.error || "Failed to apply recommendations");
      }
    } catch (error) {
      clientLogger.error("Failed to apply recommendations:", error);
      setAiError("Failed to apply recommendations");
    } finally {
      setApplying(false);
    }
  };

  useAIContextSync('part', part);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!part) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Part not found</p>
        <Link href="/parts">
          <Button variant="link">Back to Parts</Button>
        </Link>
      </div>
    );
  }

  const totalInventory = part.inventory.reduce(
    (sum, inv) => sum + inv.quantity,
    0
  );
  const totalReserved = part.inventory.reduce(
    (sum, inv) => sum + inv.reservedQty,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/parts">
            <Button variant="ghost" size="icon" aria-label="Quay lại">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{part.partNumber}</h1>
              <Badge className={LIFECYCLE_COLORS[part.lifecycleStatus]}>
                {part.lifecycleStatus}
              </Badge>
              <Badge variant="outline">Rev {part.revision}</Badge>
              {part.isCritical && (
                <Badge variant="destructive">Critical</Badge>
              )}
            </div>
            <p className="text-muted-foreground">{part.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setEditDialogOpen(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Part
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Unit Cost</p>
            <p className="text-2xl font-bold font-mono">
              {formatCurrency(part.unitCost)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">On Hand</p>
            <p className="text-2xl font-bold">{totalInventory}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Reserved</p>
            <p className="text-2xl font-bold">{totalReserved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Lead Time</p>
            <p className="text-2xl font-bold">{part.leadTimeDays} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">MOQ</p>
            <p className="text-2xl font-bold">{part.moq}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Make/Buy</p>
            <p className="text-2xl font-bold">{part.makeOrBuy}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-10">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="procurement">Procurement</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="alternates">Alternates</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="costing">Costing</TabsTrigger>
          <TabsTrigger value="ai" onClick={() => !aiRecommendation && fetchAIRecommendations()}>
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            AI
          </TabsTrigger>
          <TabsTrigger value="audit">Lịch sử</TabsTrigger>
          <TabsTrigger value="discussions">Thảo luận</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="mt-4">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label="Part Number" value={part.partNumber} />
                <InfoRow label="Name" value={part.name} />
                <InfoRow label="Description" value={part.description} />
                <InfoRow label="Category" value={part.category} />
                <InfoRow label="Sub-Category" value={part.subCategory} />
                <InfoRow label="Part Type" value={part.partType} />
                <InfoRow label="Unit" value={part.unit} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="h-5 w-5" />
                  Physical Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow
                  label="Weight"
                  value={part.weightKg ? `${part.weightKg} kg` : null}
                />
                <InfoRow
                  label="Length"
                  value={part.lengthMm ? `${part.lengthMm} mm` : null}
                />
                <InfoRow
                  label="Width"
                  value={part.widthMm ? `${part.widthMm} mm` : null}
                />
                <InfoRow
                  label="Height"
                  value={part.heightMm ? `${part.heightMm} mm` : null}
                />
                <InfoRow
                  label="Volume"
                  value={part.volumeCm3 ? `${part.volumeCm3} cm³` : null}
                />
                <InfoRow label="Color" value={part.color} />
                <InfoRow label="Material" value={part.material} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Engineering
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label="Revision" value={part.revision} />
                <InfoRow
                  label="Revision Date"
                  value={formatDate(part.revisionDate)}
                />
                <InfoRow label="Drawing Number" value={part.drawingNumber} />
                <InfoRow label="Manufacturer" value={part.manufacturer} />
                <InfoRow label="Mfr Part Number" value={part.manufacturerPn} />
                {part.drawingUrl && (
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Drawing</span>
                    <a
                      href={part.drawingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary flex items-center gap-1"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {part.datasheetUrl && (
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Datasheet</span>
                    <a
                      href={part.datasheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary flex items-center gap-1"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Quality Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow
                  label="Lot Control"
                  value={
                    part.lotControl ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-300" />
                    )
                  }
                />
                <InfoRow
                  label="Serial Control"
                  value={
                    part.serialControl ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-300" />
                    )
                  }
                />
                <InfoRow
                  label="Shelf Life"
                  value={
                    part.shelfLifeDays ? `${part.shelfLifeDays} days` : null
                  }
                />
                <InfoRow
                  label="Inspection Required"
                  value={
                    part.inspectionRequired ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-300" />
                    )
                  }
                />
                <InfoRow label="Inspection Plan" value={part.inspectionPlan} />
                <InfoRow label="AQL Level" value={part.aqlLevel} />
                <InfoRow
                  label="Certificate Required"
                  value={
                    part.certificateRequired ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-300" />
                    )
                  }
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Procurement Tab */}
        <TabsContent value="procurement" className="mt-4">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Sourcing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label="Make or Buy" value={part.makeOrBuy} />
                <InfoRow label="Procurement Type" value={part.procurementType} />
                <InfoRow label="Buyer Code" value={part.buyerCode} />
                <InfoRow
                  label="Primary Supplier"
                  value={part.supplier ? (
                    <EntityTooltip type="supplier" id={part.supplier.id}>
                      <span className="cursor-help">{part.supplier.name}</span>
                    </EntityTooltip>
                  ) : null}
                />
                {part.partSuppliers && part.partSuppliers.filter(ps => !ps.isPreferred).length > 0 && (
                  <InfoRow
                    label="Secondary Suppliers"
                    value={part.partSuppliers
                      .filter(ps => !ps.isPreferred)
                      .map(ps => ps.supplier?.name)
                      .filter(Boolean)
                      .join(", ")}
                  />
                )}
                <InfoRow label="Lead Time" value={`${part.leadTimeDays} days`} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label="MOQ" value={part.planning?.moq ?? part.moq} />
                <InfoRow label="Order Multiple" value={part.planning?.orderMultiple ?? part.orderMultiple} />
                <InfoRow label="Standard Pack" value={part.planning?.standardPack ?? part.standardPack} />
                <InfoRow label="Min Stock Level" value={part.planning?.minStockLevel ?? part.minStockLevel} />
                <InfoRow label="Reorder Point" value={part.planning?.reorderPoint ?? part.reorderPoint} />
                <InfoRow label="Max Stock" value={part.planning?.maxStock ?? part.maxStock} />
                <InfoRow label="Safety Stock" value={part.planning?.safetyStock ?? part.safetyStock} />
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Inventory by Warehouse</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Warehouse</TableHead>
                      <TableHead className="text-right">On Hand</TableHead>
                      <TableHead className="text-right">Reserved</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(part.inventory?.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground"
                        >
                          No inventory records
                        </TableCell>
                      </TableRow>
                    ) : (
                      part.inventory?.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell>{inv.warehouse.name}</TableCell>
                          <TableCell className="text-right">
                            {inv.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {inv.reservedQty}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {inv.quantity - inv.reservedQty}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="mt-4">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Export Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label="Country of Origin" value={part.countryOfOrigin} />
                <InfoRow label="HS Code" value={part.hsCode} />
                <InfoRow label="ECCN" value={part.eccn} />
                <InfoRow
                  label="NDAA Compliant"
                  value={
                    part.ndaaCompliant ? (
                      <Badge className="bg-green-100 text-green-800">Yes</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">No</Badge>
                    )
                  }
                />
                <InfoRow
                  label="ITAR Controlled"
                  value={
                    part.itarControlled ? (
                      <Badge className="bg-red-100 text-red-800">Yes</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">No</Badge>
                    )
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Environmental
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow
                  label="RoHS Compliant"
                  value={
                    part.rohsCompliant ? (
                      <Badge className="bg-green-100 text-green-800">Yes</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">No</Badge>
                    )
                  }
                />
                <InfoRow
                  label="REACH Compliant"
                  value={
                    part.reachCompliant ? (
                      <Badge className="bg-green-100 text-green-800">Yes</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">No</Badge>
                    )
                  }
                />
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Certifications</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Certificate #</TableHead>
                      <TableHead>Issuing Body</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-center">Verified</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(part.certifications?.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          No certifications
                        </TableCell>
                      </TableRow>
                    ) : (
                      part.certifications?.map((cert) => (
                        <TableRow key={cert.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {cert.certificationType}
                            </Badge>
                          </TableCell>
                          <TableCell>{cert.certificateNumber || "-"}</TableCell>
                          <TableCell>{cert.issuingBody || "-"}</TableCell>
                          <TableCell>
                            {cert.expiryDate ? (
                              <span
                                className={
                                  new Date(cert.expiryDate) < new Date()
                                    ? "text-red-500"
                                    : ""
                                }
                              >
                                {formatDate(cert.expiryDate)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {cert.verified ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-300 mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Part Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Revision</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(part.documents?.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        No documents attached
                      </TableCell>
                    </TableRow>
                  ) : (
                    part.documents?.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <Badge variant="outline">{doc.documentType}</Badge>
                        </TableCell>
                        <TableCell>{doc.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{doc.revision}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Open
                            </Button>
                          </a>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alternates Tab */}
        <TabsContent value="alternates" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Alternate Parts</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Priority</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Approved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(part.alternates?.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        No alternate parts defined
                      </TableCell>
                    </TableRow>
                  ) : (
                    part.alternates?.map((alt) => (
                      <TableRow key={alt.id}>
                        <TableCell>
                          <Badge variant="secondary">{alt.priority}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          <EntityTooltip type="part" id={alt.alternatePart.id}>
                            <Link
                              href={`/parts/${alt.alternatePart.id}`}
                              className="text-primary hover:underline cursor-help"
                            >
                              {alt.alternatePart.partNumber}
                            </Link>
                          </EntityTooltip>
                        </TableCell>
                        <TableCell>{alt.alternatePart.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{alt.alternateType}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {alt.approved ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-500 mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Revision History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Revision</TableHead>
                    <TableHead>Previous</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Changed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(part.revisions?.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        No revision history
                      </TableCell>
                    </TableRow>
                  ) : (
                    part.revisions?.map((rev) => (
                      <TableRow key={rev.id}>
                        <TableCell>
                          <Badge>{rev.revision}</Badge>
                        </TableCell>
                        <TableCell>
                          {rev.previousRevision || "-"}
                        </TableCell>
                        <TableCell>{formatDate(rev.revisionDate)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {rev.changeType || "UPDATE"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {rev.changeDescription || "-"}
                        </TableCell>
                        <TableCell>{rev.changedBy}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costing Tab */}
        <TabsContent value="costing" className="mt-4">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Current Costs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow
                  label="Unit Cost"
                  value={formatCurrency(part.unitCost)}
                />
                <InfoRow
                  label="Standard Cost"
                  value={formatCurrency(part.standardCost)}
                />
                <InfoRow
                  label="Average Cost"
                  value={formatCurrency(part.averageCost)}
                />
                <InfoRow
                  label="Landed Cost"
                  value={formatCurrency(part.landedCost)}
                />
                <Separator className="my-2" />
                <InfoRow
                  label="Freight %"
                  value={part.freightPercent ? `${part.freightPercent}%` : null}
                />
                <InfoRow
                  label="Duty %"
                  value={part.dutyPercent ? `${part.dutyPercent}%` : null}
                />
                <InfoRow
                  label="Overhead %"
                  value={
                    part.overheadPercent ? `${part.overheadPercent}%` : null
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Price Breaks</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quantity</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {part.priceBreakQty1 && (
                      <TableRow>
                        <TableCell>{part.priceBreakQty1}+</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(part.priceBreakCost1)}
                        </TableCell>
                      </TableRow>
                    )}
                    {part.priceBreakQty2 && (
                      <TableRow>
                        <TableCell>{part.priceBreakQty2}+</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(part.priceBreakCost2)}
                        </TableCell>
                      </TableRow>
                    )}
                    {part.priceBreakQty3 && (
                      <TableRow>
                        <TableCell>{part.priceBreakQty3}+</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(part.priceBreakCost3)}
                        </TableCell>
                      </TableRow>
                    )}
                    {!part.priceBreakQty1 &&
                      !part.priceBreakQty2 &&
                      !part.priceBreakQty3 && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-center text-muted-foreground"
                          >
                            No price breaks defined
                          </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Cost History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead>Currency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(part.costHistory?.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground"
                        >
                          No cost history
                        </TableCell>
                      </TableRow>
                    ) : (
                      part.costHistory?.map((cost) => (
                        <TableRow key={cost.id}>
                          <TableCell>
                            {formatDate(cost.effectiveDate)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{cost.costType}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(cost.unitCost)}
                          </TableCell>
                          <TableCell>{cost.currency}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Recommendations Tab */}
        <TabsContent value="ai" className="mt-4">
          <div className="space-y-6">
            {/* Header with refresh */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <h3 className="text-lg font-semibold">AI Safety Stock Recommendations</h3>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200">
                  AI-Powered
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAIRecommendations}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>

            {/* Error message */}
            {aiError && (
              <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
                {aiError}
              </div>
            )}

            {/* Loading state */}
            {aiLoading && !aiRecommendation && (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                    <p className="text-muted-foreground">Analyzing demand patterns...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No data state */}
            {!aiLoading && !aiRecommendation && !aiError && (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Sparkles className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">Click to analyze this part</p>
                    <Button onClick={fetchAIRecommendations}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Get AI Recommendations
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations display */}
            {aiRecommendation && (
              <div className="grid grid-cols-2 gap-6">
                {/* Safety Stock Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Safety Stock
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Current</p>
                        <p className="text-2xl font-bold">{aiRecommendation.current.safetyStock}</p>
                      </div>
                      <div className="flex items-center justify-center">
                        {aiRecommendation.delta.safetyStock > 0 ? (
                          <TrendingUp className="h-6 w-6 text-amber-500" />
                        ) : aiRecommendation.delta.safetyStock < 0 ? (
                          <TrendingDown className="h-6 w-6 text-green-500" />
                        ) : (
                          <Minus className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                        <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Recommended</p>
                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                          {aiRecommendation.recommended.safetyStock}
                        </p>
                      </div>
                    </div>
                    {aiRecommendation.delta.safetyStock !== 0 && (
                      <div className={`text-sm text-center p-2 rounded ${
                        aiRecommendation.delta.safetyStock > 0
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                          : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      }`}>
                        {aiRecommendation.delta.safetyStock > 0 ? 'Increase' : 'Decrease'} by{' '}
                        <strong>{Math.abs(aiRecommendation.delta.safetyStock)}</strong> units
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Reorder Point Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Reorder Point
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Current</p>
                        <p className="text-2xl font-bold">{aiRecommendation.current.reorderPoint}</p>
                      </div>
                      <div className="flex items-center justify-center">
                        {aiRecommendation.delta.reorderPoint > 0 ? (
                          <TrendingUp className="h-6 w-6 text-amber-500" />
                        ) : aiRecommendation.delta.reorderPoint < 0 ? (
                          <TrendingDown className="h-6 w-6 text-green-500" />
                        ) : (
                          <Minus className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                        <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Recommended</p>
                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                          {aiRecommendation.recommended.reorderPoint}
                        </p>
                      </div>
                    </div>
                    {aiRecommendation.delta.reorderPoint !== 0 && (
                      <div className={`text-sm text-center p-2 rounded ${
                        aiRecommendation.delta.reorderPoint > 0
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                          : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      }`}>
                        {aiRecommendation.delta.reorderPoint > 0 ? 'Increase' : 'Decrease'} by{' '}
                        <strong>{Math.abs(aiRecommendation.delta.reorderPoint)}</strong> units
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Analysis Factors */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Analysis Factors
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Demand Variability</span>
                      <span className="font-medium">
                        {((aiRecommendation.factors?.demandVariability || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Lead Time Variability</span>
                      <span className="font-medium">
                        {((aiRecommendation.factors?.leadTimeVariability || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Service Level Target</span>
                      <span className="font-medium">
                        {((aiRecommendation.factors?.serviceLevel || 0.95) * 100).toFixed(0)}%
                      </span>
                    </div>
                    {aiRecommendation.factors?.holidayBuffer > 0 && (
                      <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                        <span className="text-sm">Holiday Buffer Active</span>
                        <span className="font-medium">
                          +{((aiRecommendation.factors.holidayBuffer) * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Confidence Score</span>
                      <Badge variant={aiRecommendation.confidence >= 0.8 ? "default" : aiRecommendation.confidence >= 0.6 ? "secondary" : "outline"}>
                        {(aiRecommendation.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Reasoning */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      AI Reasoning
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {aiRecommendation.reasoning && aiRecommendation.reasoning.length > 0 ? (
                      <ul className="space-y-2">
                        {aiRecommendation.reasoning.map((reason, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Recommendations based on historical demand patterns, lead time analysis, and current market conditions.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Apply Button */}
                <Card className="col-span-2">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Apply AI Recommendations</p>
                        <p className="text-sm text-muted-foreground">
                          Update this part's safety stock and reorder point to AI-recommended values
                        </p>
                      </div>
                      <Button
                        onClick={applyRecommendations}
                        disabled={applying || (aiRecommendation.delta.safetyStock === 0 && aiRecommendation.delta.reorderPoint === 0)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {applying ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Applying...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Apply Recommendations
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="mt-4">
          <EntityAuditHistory entityType="Part" entityId={part.id} title="Lịch sử thay đổi" />
        </TabsContent>

        {/* Discussions Tab */}
        <TabsContent value="discussions" className="mt-4">
          <EntityDiscussions
            contextType="PART"
            contextId={part.id}
            contextTitle={`Part ${part.partNumber} - ${part.name}`}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Part Dialog */}
      <PartFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        part={part}
        onSuccess={() => {
          fetchPart(); // Refetch data after successful edit
        }}
      />
    </div>
  );
}
