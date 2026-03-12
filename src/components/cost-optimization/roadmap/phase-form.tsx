"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";

interface PhaseFormProps {
  targetId: string;
  targetName: string;
}

export function PhaseForm({ targetId, targetName }: PhaseFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [targetCost, setTargetCost] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetCost || !targetDate) return;

    setSaving(true);
    try {
      const res = await fetch("/api/cost-optimization/roadmap/phases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          costTargetId: targetId,
          name,
          targetCost: parseFloat(targetCost),
          targetDate,
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
            Them Phase — {targetName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Ten Phase</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Quick Wins, Make vs Buy, Substitute..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Chi phi muc tieu sau phase ($/unit)</Label>
              <Input
                type="number"
                step="0.01"
                value={targetCost}
                onChange={(e) => setTargetCost(e.target.value)}
                placeholder="1050.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Ngay hoan thanh muc tieu</Label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                required
              />
            </div>
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
              Them Phase
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
