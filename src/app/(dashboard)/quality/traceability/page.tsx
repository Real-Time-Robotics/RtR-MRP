"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export default function TraceabilityLookupPage() {
  const router = useRouter();
  const [lotNumber, setLotNumber] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!lotNumber.trim()) {
      setError("Please enter a lot number");
      return;
    }

    setSearching(true);
    setError("");

    try {
      const res = await fetch(`/api/quality/traceability/${encodeURIComponent(lotNumber)}`);
      if (res.ok) {
        router.push(`/quality/traceability/${encodeURIComponent(lotNumber)}`);
      } else {
        setError("Lot number not found");
      }
    } catch {
      setError("Failed to search for lot");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lot Traceability"
        description="Track materials from supplier to customer"
      />

      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Lot Lookup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter lot number (e.g., LOT-2024-KDE-0042)"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-muted-foreground mb-3">
              The lot traceability system provides complete genealogy tracking:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Forward trace: Where was this lot used?
              </li>
              <li className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Backward trace: What lots went into this product?
              </li>
              <li className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Full transaction history with timestamps
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
