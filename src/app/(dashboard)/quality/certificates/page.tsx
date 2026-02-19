"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { clientLogger } from '@/lib/client-logger';

interface Certificate {
  id: string;
  certificateNumber: string;
  status: string;
  quantity: number;
  lotNumbers: string[];
  preparedAt: string;
  salesOrder: {
    orderNumber: string;
    customer: { name: string };
  };
  product: { sku: string; name: string };
}

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchCertificates();
  }, [statusFilter]);

  const fetchCertificates = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/quality/certificates?${params}`);
      if (res.ok) {
        const result = await res.json();
        // API returns { data: [...], pagination: {...} }
        setCertificates(Array.isArray(result) ? result : (result.data || []));
      }
    } catch (error) {
      clientLogger.error("Failed to fetch certificates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id: string, certificateNumber: string) => {
    try {
      const res = await fetch(`/api/quality/certificates/${id}/generate`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${certificateNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      clientLogger.error("Failed to download certificate:", error);
    }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    approved: "bg-blue-100 text-blue-800",
    issued: "bg-green-100 text-green-800",
    voided: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chứng nhận phù hợp"
        description="Generate and manage CoC documents for customers"
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="issued">Đã cấp</SelectItem>
              <SelectItem value="voided">Voided</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="ml-auto">
            {certificates.length} certificates
          </Badge>
        </div>
      </Card>

      {/* Certificates List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : certificates.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No certificates found</p>
            <p className="text-sm">
              Certificates are generated for shipments after final inspection
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {certificates.map((cert) => (
            <Card key={cert.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{cert.certificateNumber}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[cert.status] || statusColors.draft}>
                      {cert.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(cert.id, cert.certificateNumber)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {cert.product.sku} - {cert.product.name}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>SO: {cert.salesOrder.orderNumber}</span>
                      <span>Customer: {cert.salesOrder.customer.name}</span>
                      <span>Qty: {cert.quantity}</span>
                      <span>
                        {format(new Date(cert.preparedAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <Link href={`/quality/certificates/${cert.id}`}>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
