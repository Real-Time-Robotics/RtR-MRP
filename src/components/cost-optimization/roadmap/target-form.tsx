"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { ProductSelector } from "@/components/cost-optimization/bom-cost/product-selector";

interface TargetFormProps {
  initialData?: {
    id: string;
    productId: string;
    name: string;
    currentCost: number;
    targetCost: number;
    targetDate: string;
  };
}

export function TargetForm({ initialData }: TargetFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [productId, setProductId] = useState(initialData?.productId || "");
  const [name, setName] = useState(initialData?.name || "");
  const [currentCost, setCurrentCost] = useState(
    initialData?.currentCost?.toString() || ""
  );
  const [targetCost, setTargetCost] = useState(
    initialData?.targetCost?.toString() || ""
  );
  const [targetDate, setTargetDate] = useState(
    initialData?.targetDate
      ? new Date(initialData.targetDate).toISOString().split("T")[0]
      : ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !name || !currentCost || !targetCost || !targetDate) return;

    setSaving(true);
    try {
      const url = initialData
        ? `/api/cost-optimization/roadmap/targets/${initialData.id}`
        : "/api/cost-optimization/roadmap/targets";
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          name,
          currentCost: parseFloat(currentCost),
          targetCost: parseFloat(targetCost),
          targetDate,
        }),
      });

      if (res.ok) {
        const target = await res.json();
        router.push(`/cost-optimization/roadmap/${target.id}`);
      }
    } catch {
      // ignore
    }
    setSaving(false);
  };

  const reduction =
    currentCost && targetCost
      ? parseFloat(currentCost) - parseFloat(targetCost)
      : 0;
  const reductionPercent =
    currentCost && parseFloat(currentCost) > 0
      ? ((reduction / parseFloat(currentCost)) * 100).toFixed(1)
      : "0";

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {initialData ? "Chinh sua muc tieu" : "Tao muc tieu moi"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>San pham</Label>
            <ProductSelector
              selectedId={productId}
              onSelect={(id) => setProductId(id)}
            />
          </div>

          <div className="space-y-2">
            <Label>Ten muc tieu</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Giam 50% chi phi HERA V2"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Chi phi hien tai ($/unit)</Label>
              <Input
                type="number"
                step="0.01"
                value={currentCost}
                onChange={(e) => setCurrentCost(e.target.value)}
                placeholder="1250.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Chi phi muc tieu ($/unit)</Label>
              <Input
                type="number"
                step="0.01"
                value={targetCost}
                onChange={(e) => setTargetCost(e.target.value)}
                placeholder="625.00"
                required
              />
            </div>
          </div>

          {reduction > 0 && (
            <div className="p-3 bg-green-50 rounded-lg text-sm">
              Can giam: <span className="font-bold text-green-700">${reduction.toFixed(2)}/unit</span>{" "}
              ({reductionPercent}%)
            </div>
          )}

          <div className="space-y-2">
            <Label>Ngay muc tieu</Label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Huy
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              <Save className="w-4 h-4 mr-1" />
              {initialData ? "Cap nhat" : "Tao muc tieu"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
