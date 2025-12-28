"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardCheck, CheckCircle, XCircle, Award } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function FinalInspectionPage() {
  // Placeholder data - would come from API
  const inspections = [
    {
      id: "1",
      workOrderNumber: "WO-2024-001",
      productSku: "HERA-X8-PRO",
      productName: "HERA X8 Professional Drone",
      serialNumber: "HX8-2024-0001",
      inspectedBy: "John Smith",
      status: "passed",
      inspectionDate: "2024-12-28",
      certificateIssued: true,
    },
    {
      id: "2",
      workOrderNumber: "WO-2024-002",
      productSku: "HERA-X8-PRO",
      productName: "HERA X8 Professional Drone",
      serialNumber: "HX8-2024-0002",
      inspectedBy: "Sarah Lee",
      status: "passed",
      inspectionDate: "2024-12-27",
      certificateIssued: true,
    },
    {
      id: "3",
      workOrderNumber: "WO-2024-003",
      productSku: "HERA-X8-PRO",
      productName: "HERA X8 Professional Drone",
      serialNumber: "HX8-2024-0003",
      inspectedBy: "Mike Johnson",
      status: "failed",
      inspectionDate: "2024-12-26",
      certificateIssued: false,
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "passed":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Passed</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Final Inspection"
        description="Quality inspections before product shipment"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Inspection
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">18</p>
                <p className="text-sm text-muted-foreground">Total Inspections</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">16</p>
                <p className="text-sm text-muted-foreground">Passed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">2</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">88.9%</p>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inspections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Final Inspections</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work Order</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Certificate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspections.map((inspection) => (
                <TableRow key={inspection.id}>
                  <TableCell className="font-medium">{inspection.workOrderNumber}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{inspection.productSku}</div>
                      <div className="text-sm text-muted-foreground">{inspection.productName}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{inspection.serialNumber}</TableCell>
                  <TableCell>{inspection.inspectedBy}</TableCell>
                  <TableCell>{inspection.inspectionDate}</TableCell>
                  <TableCell>{getStatusBadge(inspection.status)}</TableCell>
                  <TableCell>
                    {inspection.certificateIssued ? (
                      <Badge className="bg-purple-100 text-purple-800">
                        <Award className="h-3 w-3 mr-1" />Issued
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
