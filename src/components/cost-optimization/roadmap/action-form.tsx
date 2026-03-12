"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Loader2, Save } from "lucide-react";
import { PartSelector } from "@/components/cost-optimization/make-vs-buy/part-selector";

interface ActionFormProps {
  targetId: string;
  phaseId: string;
  phaseName: string;
}

export function ActionForm({ targetId, phaseId, phaseName }: ActionFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "",
    partId: "",
    description: "",
    currentCost: "",
    targetCost: "",
    annualVolume: "",
    investmentRequired: "",
    targetCompletionDate: "",
    startDate: "",
    riskLevel: "LOW",
    notes: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const savingsPerUnit =
    form.currentCost && form.targetCost
      ? parseFloat(form.currentCost) - parseFloat(form.targetCost)
      : 0;
  const annualSavings = savingsPerUnit * (parseFloat(form.annualVolume) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.type || !form.description || !form.currentCost || !form.targetCost || !form.targetCompletionDate) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/cost-optimization/roadmap/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseId,
          type: form.type,
          partId: form.partId || null,
          description: form.description,
          currentCost: parseFloat(form.currentCost),
          targetCost: parseFloat(form.targetCost),
          annualVolume: parseInt(form.annualVolume) || 0,
          investmentRequired: parseFloat(form.investmentRequired) || 0,
          targetCompletionDate: form.targetCompletionDate,
          startDate: form.startDate || null,
          riskLevel: form.riskLevel,
          notes: form.notes || null,
        }),
      });

      if (res.ok) {
        router.push(`/cost-optimization/roadmap/${targetId}`);
      }
    } catch {
      // ignore
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Them Action — {phaseName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Loai Action</Label>
              <Select value={form.type} onValueChange={(v) => updateField("type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chon loai..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAKE_VS_BUY">Make vs Buy</SelectItem>
                  <SelectItem value="SUBSTITUTE">Substitute</SelectItem>
                  <SelectItem value="SUPPLIER_OPTIMIZE">Supplier Optimize</SelectItem>
                  <SelectItem value="PROCESS_IMPROVE">Process Improve</SelectItem>
                  <SelectItem value="DESIGN_CHANGE">Design Change</SelectItem>
                  <SelectItem value="LOCALIZE">Localize</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Linh kien (optional)</Label>
              <PartSelector
                value={form.partId}
                onChange={(id) => updateField("partId", id)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mo ta</Label>
            <Textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Mo ta chi tiet action..."
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Chi phi hien tai ($/unit)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.currentCost}
                onChange={(e) => updateField("currentCost", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Chi phi muc tieu ($/unit)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.targetCost}
                onChange={(e) => updateField("targetCost", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>San luong nam</Label>
              <Input
                type="number"
                value={form.annualVolume}
                onChange={(e) => updateField("annualVolume", e.target.value)}
              />
            </div>
          </div>

          {savingsPerUnit > 0 && (
            <div className="p-3 bg-green-50 rounded-lg text-sm space-y-1">
              <div>
                Savings/unit:{" "}
                <span className="font-bold text-green-700">
                  ${savingsPerUnit.toFixed(2)}
                </span>
              </div>
              {annualSavings > 0 && (
                <div>
                  Savings/nam:{" "}
                  <span className="font-bold text-green-700">
                    ${annualSavings.toFixed(0)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Von dau tu ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.investmentRequired}
                onChange={(e) => updateField("investmentRequired", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ngay bat dau</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ngay hoan thanh muc tieu</Label>
              <Input
                type="date"
                value={form.targetCompletionDate}
                onChange={(e) => updateField("targetCompletionDate", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Muc do rui ro</Label>
              <Select
                value={form.riskLevel}
                onValueChange={(v) => updateField("riskLevel", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ghi chu</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Ghi chu them..."
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
              Them Action
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
