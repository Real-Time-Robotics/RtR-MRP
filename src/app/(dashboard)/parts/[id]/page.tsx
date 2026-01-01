"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

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

  supplier: { id: string; name: string } | null;
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

export default function PartDetailPage() {
  const params = useParams();
  const [part, setPart] = useState<Part | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPart() {
      try {
        const res = await fetch(`/api/parts/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setPart(data);
        }
      } catch (error) {
        console.error("Failed to fetch part:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPart();
  }, [params.id]);

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
            <Button variant="ghost" size="icon">
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
          <Link href={`/parts/${part.id}/edit`}>
            <Button>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Part
            </Button>
          </Link>
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="procurement">Procurement</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="alternates">Alternates</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="costing">Costing</TabsTrigger>
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
                  value={part.supplier?.name}
                />
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
                <InfoRow label="MOQ" value={part.moq} />
                <InfoRow label="Order Multiple" value={part.orderMultiple} />
                <InfoRow label="Standard Pack" value={part.standardPack} />
                <InfoRow label="Min Stock Level" value={part.minStockLevel} />
                <InfoRow label="Reorder Point" value={part.reorderPoint} />
                <InfoRow label="Max Stock" value={part.maxStock} />
                <InfoRow label="Safety Stock" value={part.safetyStock} />
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
                          <Link
                            href={`/parts/${alt.alternatePart.id}`}
                            className="text-primary hover:underline"
                          >
                            {alt.alternatePart.partNumber}
                          </Link>
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
      </Tabs>
    </div>
  );
}
