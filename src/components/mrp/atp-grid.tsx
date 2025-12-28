"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ATPBucket {
  periodStart: Date;
  periodEnd: Date;
  beginningQty: number;
  supplyQty: number;
  demandQty: number;
  atpQty: number;
  cumulativeATP: number;
}

interface ATPGridProps {
  partNumber: string;
  requestedQty: number;
  requestedDate: Date;
  atpQty: number;
  atpDate: Date | null;
  ctpQty: number;
  ctpDate: Date | null;
  grid: ATPBucket[];
  ctpDetails?: {
    canProduce: boolean;
    startDate: Date;
    completionDate: Date;
    productionQty: number;
    capacityAvailable: boolean;
    totalProductionHours: number;
    componentsAvailable: Array<{
      partNumber: string;
      required: number;
      available: number;
      shortage: number;
    }>;
  };
}

export function ATPGrid({
  partNumber,
  requestedQty,
  requestedDate,
  atpQty,
  atpDate,
  ctpQty,
  ctpDate,
  grid,
  ctpDetails,
}: ATPGridProps) {
  const canFulfill = atpQty + ctpQty >= requestedQty;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>ATP/CTP Analysis - {partNumber}</span>
            <Badge className={canFulfill ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
              {canFulfill ? "Can Fulfill" : "Cannot Fulfill"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Requested</div>
              <div className="text-2xl font-bold">{requestedQty}</div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(requestedDate), "MMM dd, yyyy")}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600">ATP (Available)</div>
              <div className="text-2xl font-bold text-green-700">{atpQty}</div>
              <div className="text-xs text-green-600">
                {atpDate ? format(new Date(atpDate), "MMM dd, yyyy") : "N/A"}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600">CTP (Can Produce)</div>
              <div className="text-2xl font-bold text-blue-700">{ctpQty}</div>
              <div className="text-xs text-blue-600">
                {ctpDate ? format(new Date(ctpDate), "MMM dd, yyyy") : "N/A"}
              </div>
            </div>
            <div className={`p-4 rounded-lg ${canFulfill ? "bg-green-50" : "bg-red-50"}`}>
              <div className={`text-sm ${canFulfill ? "text-green-600" : "text-red-600"}`}>
                {canFulfill ? "Total Available" : "Shortage"}
              </div>
              <div className={`text-2xl font-bold ${canFulfill ? "text-green-700" : "text-red-700"}`}>
                {canFulfill ? atpQty + ctpQty : requestedQty - atpQty - ctpQty}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ATP Grid Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Weekly ATP Buckets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Beginning</TableHead>
                  <TableHead className="text-right">Supply</TableHead>
                  <TableHead className="text-right">Demand</TableHead>
                  <TableHead className="text-right">ATP</TableHead>
                  <TableHead className="text-right">Cumulative</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grid.map((bucket, index) => (
                  <TableRow
                    key={index}
                    className={bucket.atpQty < 0 ? "bg-red-50" : ""}
                  >
                    <TableCell className="font-medium">
                      {format(new Date(bucket.periodStart), "MMM dd")} -{" "}
                      {format(new Date(bucket.periodEnd), "MMM dd")}
                    </TableCell>
                    <TableCell className="text-right">{bucket.beginningQty}</TableCell>
                    <TableCell className="text-right text-green-600">
                      +{bucket.supplyQty}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      -{bucket.demandQty}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        bucket.atpQty < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {bucket.atpQty}
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold ${
                        bucket.cumulativeATP < 0 ? "text-red-600" : ""
                      }`}
                    >
                      {bucket.cumulativeATP}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* CTP Details */}
      {ctpDetails && ctpDetails.componentsAvailable.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              CTP Component Availability
              <Badge
                className={
                  ctpDetails.canProduce
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }
              >
                {ctpDetails.canProduce ? "Can Produce" : "Cannot Produce"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Production Start:</span>{" "}
                <span className="font-medium">
                  {format(new Date(ctpDetails.startDate), "MMM dd, yyyy")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Completion:</span>{" "}
                <span className="font-medium">
                  {format(new Date(ctpDetails.completionDate), "MMM dd, yyyy")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Production Hours:</span>{" "}
                <span className="font-medium">{ctpDetails.totalProductionHours}h</span>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead className="text-right">Required</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Shortage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ctpDetails.componentsAvailable.map((comp, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{comp.partNumber}</TableCell>
                    <TableCell className="text-right">{comp.required}</TableCell>
                    <TableCell className="text-right">{comp.available}</TableCell>
                    <TableCell
                      className={`text-right ${comp.shortage > 0 ? "text-red-600" : ""}`}
                    >
                      {comp.shortage}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          comp.shortage === 0
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {comp.shortage === 0 ? "Available" : "Short"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
