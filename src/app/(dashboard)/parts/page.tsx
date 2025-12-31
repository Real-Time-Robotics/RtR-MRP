"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Edit2,
  ChevronDown,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Part {
  id: string;
  partNumber: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  unitCost: number;
  makeOrBuy: string;
  procurementType: string;
  lifecycleStatus: string;
  ndaaCompliant: boolean;
  itarControlled: boolean;
  rohsCompliant: boolean;
  reachCompliant: boolean;
  manufacturer: string | null;
  manufacturerPn: string | null;
  revision: string;
  leadTimeDays: number;
  moq: number;
  isCritical: boolean;
  supplier: {
    id: string;
    name: string;
  } | null;
}

const LIFECYCLE_COLORS: Record<string, string> = {
  DEVELOPMENT: "bg-purple-100 text-purple-800",
  PROTOTYPE: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-green-100 text-green-800",
  PHASE_OUT: "bg-yellow-100 text-yellow-800",
  OBSOLETE: "bg-red-100 text-red-800",
  EOL: "bg-gray-100 text-gray-800",
};

const MAKE_BUY_COLORS: Record<string, string> = {
  MAKE: "bg-indigo-100 text-indigo-800",
  BUY: "bg-orange-100 text-orange-800",
  BOTH: "bg-teal-100 text-teal-800",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function PartsPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<string>("all");
  const [makeOrBuyFilter, setMakeOrBuyFilter] = useState<string>("all");

  useEffect(() => {
    fetchParts();
  }, []);

  async function fetchParts() {
    try {
      const res = await fetch("/api/parts");
      if (res.ok) {
        const data = await res.json();
        setParts(data);
      }
    } catch (error) {
      console.error("Failed to fetch parts:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredParts = parts.filter((part) => {
    const matchesSearch =
      search === "" ||
      part.partNumber.toLowerCase().includes(search.toLowerCase()) ||
      part.name.toLowerCase().includes(search.toLowerCase()) ||
      part.manufacturer?.toLowerCase().includes(search.toLowerCase()) ||
      part.manufacturerPn?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || part.category === categoryFilter;
    const matchesLifecycle =
      lifecycleFilter === "all" || part.lifecycleStatus === lifecycleFilter;
    const matchesMakeOrBuy =
      makeOrBuyFilter === "all" || part.makeOrBuy === makeOrBuyFilter;

    return (
      matchesSearch && matchesCategory && matchesLifecycle && matchesMakeOrBuy
    );
  });

  const categories = Array.from(new Set(parts.map((p) => p.category)));

  // Stats
  const stats = {
    total: parts.length,
    active: parts.filter((p) => p.lifecycleStatus === "ACTIVE").length,
    ndaaCompliant: parts.filter((p) => p.ndaaCompliant).length,
    itarControlled: parts.filter((p) => p.itarControlled).length,
    critical: parts.filter((p) => p.isCritical).length,
    make: parts.filter((p) => p.makeOrBuy === "MAKE").length,
    buy: parts.filter((p) => p.makeOrBuy === "BUY").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Parts Master v2.0
            </h1>
            <p className="text-muted-foreground">
              Enhanced parts management with AS9100/ITAR compliance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/excel/import">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </Link>
            <Link href="/excel/export">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </Link>
            <Link href="/parts/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Part
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-7 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Total Parts</p>
              </div>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                <p className="text-sm text-muted-foreground">NDAA</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {stats.ndaaCompliant}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-sm text-muted-foreground">ITAR</p>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {stats.itarControlled}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {stats.critical}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-indigo-500" />
                <p className="text-sm text-muted-foreground">Make</p>
              </div>
              <p className="text-2xl font-bold text-indigo-600">{stats.make}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-orange-500" />
                <p className="text-sm text-muted-foreground">Buy</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">{stats.buy}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by part #, name, manufacturer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={lifecycleFilter}
                onValueChange={setLifecycleFilter}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Lifecycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="DEVELOPMENT">Development</SelectItem>
                  <SelectItem value="PROTOTYPE">Prototype</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PHASE_OUT">Phase Out</SelectItem>
                  <SelectItem value="OBSOLETE">Obsolete</SelectItem>
                  <SelectItem value="EOL">End of Life</SelectItem>
                </SelectContent>
              </Select>
              <Select value={makeOrBuyFilter} onValueChange={setMakeOrBuyFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Make/Buy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="MAKE">Make</SelectItem>
                  <SelectItem value="BUY">Buy</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Parts Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Parts ({filteredParts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Make/Buy</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Rev</TableHead>
                  <TableHead className="text-center">Compliance</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <p className="text-muted-foreground">No parts found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParts.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell className="font-mono font-medium">
                        <Link
                          href={`/parts/${part.id}`}
                          className="hover:underline text-primary"
                        >
                          {part.partNumber}
                        </Link>
                        {part.isCritical && (
                          <AlertTriangle className="inline h-3 w-3 ml-1 text-orange-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-48 truncate">{part.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{part.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={MAKE_BUY_COLORS[part.makeOrBuy] || ""}
                        >
                          {part.makeOrBuy}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{part.manufacturer || "-"}</p>
                          {part.manufacturerPn && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {part.manufacturerPn}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{part.revision}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip>
                            <TooltipTrigger>
                              {part.ndaaCompliant ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              NDAA: {part.ndaaCompliant ? "Compliant" : "Non-compliant"}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger>
                              {part.itarControlled ? (
                                <Shield className="h-4 w-4 text-red-500" />
                              ) : (
                                <div className="h-4 w-4" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              ITAR: {part.itarControlled ? "Controlled" : "Not controlled"}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger>
                              {part.rohsCompliant ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-yellow-500" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              RoHS: {part.rohsCompliant ? "Compliant" : "Non-compliant"}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(part.unitCost)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            LIFECYCLE_COLORS[part.lifecycleStatus] || ""
                          }
                        >
                          {part.lifecycleStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Actions
                              <ChevronDown className="h-4 w-4 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/parts/${part.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/parts/${part.id}/edit`}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/parts/${part.id}?tab=documents`}>
                                <FileText className="h-4 w-4 mr-2" />
                                Documents
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/parts/${part.id}?tab=certifications`}>
                                <Shield className="h-4 w-4 mr-2" />
                                Certifications
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
