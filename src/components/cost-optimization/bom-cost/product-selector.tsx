"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Product {
  id: string;
  sku: string;
  name: string;
}

interface ProductSelectorProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ProductSelector({ selectedId, onSelect }: ProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products?pageSize=100");
        const json = await res.json();
        setProducts(json.data || []);
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  return (
    <Select value={selectedId || ""} onValueChange={onSelect} disabled={loading}>
      <SelectTrigger className="w-[320px]">
        <SelectValue placeholder={loading ? "Loading..." : "Chọn sản phẩm..."} />
      </SelectTrigger>
      <SelectContent>
        {products.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.sku} — {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
