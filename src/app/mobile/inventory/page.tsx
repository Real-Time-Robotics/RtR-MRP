"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Package,
  Scan,
  Plus,
  ArrowRightLeft,
  Calculator,
  Loader2,
} from "lucide-react";
import { searchParts } from "@/lib/mobile";
import { haptic } from "@/lib/mobile/haptics";
import Link from "next/link";

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  onHand: number;
  available: number;
  uom: string;
  location?: string;
}

export default function InventoryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // First try local cache
      const localResults = await searchParts(searchQuery);
      if (localResults.length > 0) {
        // For demo, mock inventory data
        setItems(
          localResults.map((part) => ({
            id: part.id,
            sku: part.sku,
            name: part.name,
            onHand: Math.floor(Math.random() * 100),
            available: Math.floor(Math.random() * 80),
            uom: part.uom,
            location: "A-01-01",
          }))
        );
      } else {
        // Try API
        const response = await fetch(
          `/api/mobile/inventory/search?q=${encodeURIComponent(searchQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setItems(data.items || []);
        } else {
          setError("Failed to search inventory");
        }
      }
    } catch {
      setError("Search failed. Check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = () => {
    haptic("light");
    router.push("/mobile/scan");
  };

  return (
    <div className="min-h-screen">
      <MobileHeader
        title="Inventory"
        subtitle="Search and manage inventory"
        showBack
        backHref="/mobile"
        actions={
          <Button variant="ghost" size="icon" onClick={handleScan}>
            <Scan className="h-5 w-5" />
          </Button>
        }
      />

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Search parts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2">
          <Link href="/mobile/inventory/adjust">
            <Card className="cursor-pointer hover:shadow-md active:scale-95 transition-all">
              <CardContent className="p-3 flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Plus className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-xs font-medium">Adjust</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/mobile/inventory/transfer">
            <Card className="cursor-pointer hover:shadow-md active:scale-95 transition-all">
              <CardContent className="p-3 flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <ArrowRightLeft className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-xs font-medium">Transfer</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/mobile/inventory/count">
            <Card className="cursor-pointer hover:shadow-md active:scale-95 transition-all">
              <CardContent className="p-3 flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Calculator className="h-4 w-4 text-yellow-600" />
                </div>
                <span className="text-xs font-medium">Count</span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Error message */}
        {error && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-3 text-red-600 text-sm">
              {error}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {items.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              RESULTS ({items.length})
            </h3>
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/mobile/inventory/${item.id}`}
                onClick={() => haptic("selection")}
              >
                <Card className="hover:shadow-md active:scale-[0.99] transition-all">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-sm">
                            {item.sku}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {item.uom}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {item.name}
                        </p>
                        {item.location && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Location: {item.location}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{item.onHand}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.available} avail
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : searchQuery && !isLoading ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No items found</p>
              <p className="text-xs mt-1">
                Try a different search term or scan a barcode
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Search for parts</p>
              <p className="text-xs mt-1">
                Enter a part number or name to search
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
