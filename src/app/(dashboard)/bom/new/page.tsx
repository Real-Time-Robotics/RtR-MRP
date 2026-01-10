"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { toast } from "sonner";

interface Product {
  id: string;
  sku: string;
  name: string;
}

export default function NewBOMPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [fetchingProducts, setFetchingProducts] = useState(true);

  // Form state
  const [productId, setProductId] = useState("");
  const [version, setVersion] = useState("1.0");
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      const data = await response.json();
      // Handle both array and paginated response
      const productsArray = Array.isArray(data) ? data : (data?.data || []);
      setProducts(productsArray);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error("Failed to load products");
    } finally {
      setFetchingProducts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId) {
      toast.error("Please select a product");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          version,
          effectiveDate,
          notes: notes || null,
          status: "draft",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("BOM created successfully!");
        router.push(`/bom/${data.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create BOM");
      }
    } catch (error) {
      console.error("Failed to create BOM:", error);
      toast.error("Failed to create BOM");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/bom">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create New BOM</h1>
          <p className="text-muted-foreground">
            Create a new Bill of Materials for a product
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>BOM Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Product Selection */}
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Select
                value={productId}
                onValueChange={setProductId}
                disabled={fetchingProducts}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      fetchingProducts ? "Loading products..." : "Select product..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.sku} - {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the finished product for this BOM
              </p>
            </div>

            {/* Version and Effective Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="version">Version *</Label>
                <Input
                  id="version"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  BOM version number (e.g., 1.0, 2.0)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="effectiveDate">Effective Date *</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Date when this BOM becomes active
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this BOM..."
                rows={3}
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                After creating the BOM header, you can add component parts in
                the BOM detail page.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Link href="/bom">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || !productId}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create BOM"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
