"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PartOption {
  id: string;
  partNumber: string;
  name: string;
  category: string | null;
  unitCost: number | null;
  makeOrBuy: string | null;
}

interface PartSelectorProps {
  value: string;
  onChange: (partId: string, part: PartOption | null) => void;
  excludeIds?: string[];
}

export function PartSelector({ value, onChange, excludeIds = [] }: PartSelectorProps) {
  const [parts, setParts] = useState<PartOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchParts = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/parts?pageSize=100&search=${encodeURIComponent(search)}`
        );
        if (res.ok) {
          const json = await res.json();
          const items = json.data || json.parts || [];
          setParts(
            items.filter(
              (p: PartOption) => !excludeIds.includes(p.id)
            )
          );
        }
      } catch {
        // ignore
      }
      setLoading(false);
    };

    const timer = setTimeout(fetchParts, 300);
    return () => clearTimeout(timer);
  }, [search, excludeIds]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tim kiem part..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select
        value={value}
        onValueChange={(val) => {
          const part = parts.find((p) => p.id === val) || null;
          onChange(val, part);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Dang tai..." : "Chon part"} />
        </SelectTrigger>
        <SelectContent>
          {parts.map((part) => (
            <SelectItem key={part.id} value={part.id}>
              <span className="font-mono text-xs">{part.partNumber}</span>
              <span className="ml-2 text-sm">{part.name}</span>
            </SelectItem>
          ))}
          {parts.length === 0 && !loading && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Khong tim thay part
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
