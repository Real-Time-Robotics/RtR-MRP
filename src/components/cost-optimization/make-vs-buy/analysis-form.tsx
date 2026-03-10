"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  Factory,
  Calculator,
  Save,
  Loader2,
} from "lucide-react";
import { PartSelector } from "./part-selector";
import { ROICalculator } from "./roi-calculator";
import { ROIChart } from "./roi-chart";
import { ScoringDisplay } from "./scoring-display";
import { CapabilityGaps } from "./capability-gaps";
import { calculateROI } from "@/lib/cost-optimization/roi-calculations";
import { calculateScore, ScoringInput } from "@/lib/cost-optimization/scoring";

interface CapabilityGap {
  area: string;
  current: number;
  required: number;
  gap: number;
  action: string;
}

export function AnalysisForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Part selection
  const [partId, setPartId] = useState("");
  const [selectedPart, setSelectedPart] = useState<{
    partNumber: string;
    name: string;
  } | null>(null);

  // Buy option
  const [buyPrice, setBuyPrice] = useState<number>(0);
  const [buyMOQ, setBuyMOQ] = useState<number>(1);
  const [buyLeadTimeDays, setBuyLeadTimeDays] = useState<number>(30);

  // Make option
  const [makeCostEstimate, setMakeCostEstimate] = useState<number>(0);
  const [makeInvestmentRequired, setMakeInvestmentRequired] = useState<number>(0);
  const [makeLeadTimeDays, setMakeLeadTimeDays] = useState<number>(14);
  const [makeTimelineMonths, setMakeTimelineMonths] = useState<number>(3);

  // Volume
  const [annualVolumeEstimate, setAnnualVolumeEstimate] = useState<number>(1000);

  // Scoring inputs
  const [volumeCertainty, setVolumeCertainty] = useState(5);
  const [technicalSkill, setTechnicalSkill] = useState(5);
  const [equipmentAvailable, setEquipmentAvailable] = useState(5);
  const [qualityCapability, setQualityCapability] = useState(5);
  const [capacityAvailable, setCapacityAvailable] = useState(5);
  const [supplyChainRisk, setSupplyChainRisk] = useState(5);
  const [complianceBenefit, setComplianceBenefit] = useState(5);
  const [leadTimeReduction, setLeadTimeReduction] = useState(5);
  const [ipProtection, setIpProtection] = useState(5);

  // Capability gaps
  const [capabilityGaps, setCapabilityGaps] = useState<CapabilityGap[]>([]);

  // Calculated results
  const roi = useMemo(() => {
    if (buyPrice <= 0 || makeCostEstimate <= 0) return null;
    return calculateROI({
      buyPrice,
      makeCost: makeCostEstimate,
      investment: makeInvestmentRequired,
      annualVolume: annualVolumeEstimate,
    });
  }, [buyPrice, makeCostEstimate, makeInvestmentRequired, annualVolumeEstimate]);

  const scoring = useMemo(() => {
    if (!roi) return null;
    const input: ScoringInput = {
      savingsPercent: roi.savingsPercent,
      investmentRequired: makeInvestmentRequired,
      breakEvenMonths: roi.breakEvenMonths,
      volumeCertainty,
      technicalSkillAvailable: technicalSkill,
      equipmentAvailable,
      qualityCapability,
      capacityAvailable,
      supplyChainRiskReduction: supplyChainRisk,
      complianceBenefit,
      leadTimeReduction,
      ipProtection,
    };
    return calculateScore(input);
  }, [
    roi,
    makeInvestmentRequired,
    volumeCertainty,
    technicalSkill,
    equipmentAvailable,
    qualityCapability,
    capacityAvailable,
    supplyChainRisk,
    complianceBenefit,
    leadTimeReduction,
    ipProtection,
  ]);

  const handleSave = async () => {
    if (!partId || buyPrice <= 0 || makeCostEstimate <= 0) return;

    setSaving(true);
    try {
      const scoringInput: ScoringInput = {
        savingsPercent: roi?.savingsPercent || 0,
        investmentRequired: makeInvestmentRequired,
        breakEvenMonths: roi?.breakEvenMonths || 0,
        volumeCertainty,
        technicalSkillAvailable: technicalSkill,
        equipmentAvailable,
        qualityCapability,
        capacityAvailable,
        supplyChainRiskReduction: supplyChainRisk,
        complianceBenefit,
        leadTimeReduction,
        ipProtection,
      };

      const res = await fetch("/api/cost-optimization/make-vs-buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId,
          buyPrice,
          buyMOQ,
          buyLeadTimeDays,
          buyRisks: [],
          makeCostEstimate,
          makeInvestmentRequired,
          makeLeadTimeDays,
          makeTimelineMonths,
          makeCapabilityGaps: capabilityGaps.length > 0 ? capabilityGaps : null,
          annualVolumeEstimate,
          scoringInput,
        }),
      });

      if (res.ok) {
        const analysis = await res.json();
        router.push(`/cost-optimization/make-vs-buy/${analysis.id}`);
      }
    } catch {
      // handle error silently
    }
    setSaving(false);
  };

  const addCapabilityGap = () => {
    setCapabilityGaps([
      ...capabilityGaps,
      { area: "", current: 3, required: 7, gap: 4, action: "" },
    ]);
  };

  const updateGap = (index: number, field: keyof CapabilityGap, value: string | number) => {
    const updated = [...capabilityGaps];
    (updated[index] as unknown as Record<string, string | number>)[field] = value;
    if (field === "current" || field === "required") {
      updated[index].gap = Math.max(0, updated[index].required - updated[index].current);
    }
    setCapabilityGaps(updated);
  };

  const removeGap = (index: number) => {
    setCapabilityGaps(capabilityGaps.filter((_, i) => i !== index));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left column: Input */}
      <div className="lg:col-span-2 space-y-4">
        {/* Part Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Chon Part</CardTitle>
          </CardHeader>
          <CardContent>
            <PartSelector
              value={partId}
              onChange={(id, part) => {
                setPartId(id);
                if (part) {
                  setSelectedPart({ partNumber: part.partNumber, name: part.name });
                  if (part.unitCost) setBuyPrice(part.unitCost);
                }
              }}
            />
            {selectedPart && (
              <div className="mt-2 text-sm text-muted-foreground">
                Da chon: <span className="font-mono">{selectedPart.partNumber}</span> — {selectedPart.name}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Buy vs Make side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Buy Option */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-orange-500" />
                Mua ngoai (Buy)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Gia mua ($)</Label>
                <Input
                  type="number"
                  value={buyPrice || ""}
                  onChange={(e) => setBuyPrice(Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-xs">MOQ</Label>
                <Input
                  type="number"
                  value={buyMOQ || ""}
                  onChange={(e) => setBuyMOQ(Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">Lead time (ngay)</Label>
                <Input
                  type="number"
                  value={buyLeadTimeDays || ""}
                  onChange={(e) => setBuyLeadTimeDays(Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Make Option */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Factory className="w-4 h-4 text-blue-500" />
                Tu san xuat (Make)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Chi phi uoc tinh ($)</Label>
                <Input
                  type="number"
                  value={makeCostEstimate || ""}
                  onChange={(e) => setMakeCostEstimate(Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-xs">Von dau tu ($)</Label>
                <Input
                  type="number"
                  value={makeInvestmentRequired || ""}
                  onChange={(e) => setMakeInvestmentRequired(Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">Lead time (ngay)</Label>
                <Input
                  type="number"
                  value={makeLeadTimeDays || ""}
                  onChange={(e) => setMakeLeadTimeDays(Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">Timeline trien khai (thang)</Label>
                <Input
                  type="number"
                  value={makeTimelineMonths || ""}
                  onChange={(e) => setMakeTimelineMonths(Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Volume */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              San luong & Danh gia nang luc
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">San luong hang nam (don vi)</Label>
              <Input
                type="number"
                value={annualVolumeEstimate || ""}
                onChange={(e) => setAnnualVolumeEstimate(Number(e.target.value))}
              />
            </div>

            <Separator />

            {/* Scoring sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Do chac chan san luong", value: volumeCertainty, set: setVolumeCertainty },
                { label: "Ky nang ky thuat", value: technicalSkill, set: setTechnicalSkill },
                { label: "Thiet bi san co", value: equipmentAvailable, set: setEquipmentAvailable },
                { label: "Nang luc chat luong", value: qualityCapability, set: setQualityCapability },
                { label: "Cong suat san co", value: capacityAvailable, set: setCapacityAvailable },
                { label: "Giam rui ro chuoi cung ung", value: supplyChainRisk, set: setSupplyChainRisk },
                { label: "Loi ich tuan thu", value: complianceBenefit, set: setComplianceBenefit },
                { label: "Giam lead time", value: leadTimeReduction, set: setLeadTimeReduction },
                { label: "Bao ve IP", value: ipProtection, set: setIpProtection },
              ].map((s) => (
                <div key={s.label} className="space-y-1">
                  <div className="flex justify-between">
                    <Label className="text-xs">{s.label}</Label>
                    <span className="text-xs font-mono">{s.value}/10</span>
                  </div>
                  <Slider
                    value={[s.value]}
                    onValueChange={([v]) => s.set(v)}
                    min={0}
                    max={10}
                    step={1}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Capability Gaps */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Capability Gaps</CardTitle>
              <Button variant="outline" size="sm" onClick={addCapabilityGap}>
                Them gap
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {capabilityGaps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Chua co gap nao. Nhan &quot;Them gap&quot; de them.
              </p>
            ) : (
              <div className="space-y-3">
                {capabilityGaps.map((gap, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 items-end">
                    <div>
                      <Label className="text-xs">Linh vuc</Label>
                      <Input
                        value={gap.area}
                        onChange={(e) => updateGap(i, "area", e.target.value)}
                        placeholder="VD: CNC Milling"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Hien tai</Label>
                      <Input
                        type="number"
                        value={gap.current}
                        onChange={(e) => updateGap(i, "current", Number(e.target.value))}
                        min={0}
                        max={10}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Yeu cau</Label>
                      <Input
                        type="number"
                        value={gap.required}
                        onChange={(e) => updateGap(i, "required", Number(e.target.value))}
                        min={0}
                        max={10}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Hanh dong</Label>
                      <Input
                        value={gap.action}
                        onChange={(e) => updateGap(i, "action", e.target.value)}
                        placeholder="VD: Dao tao nhan vien"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={() => removeGap(i)}
                    >
                      Xoa
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || !partId || buyPrice <= 0 || makeCostEstimate <= 0}
            size="lg"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Luu phan tich
          </Button>
        </div>
      </div>

      {/* Right column: Live results */}
      <div className="space-y-4">
        {roi && (
          <>
            <ROICalculator roi={roi} />
            <ROIChart
              buyPrice={buyPrice}
              makeCost={makeCostEstimate}
              investment={makeInvestmentRequired}
              annualVolume={annualVolumeEstimate}
            />
          </>
        )}
        {scoring && (
          <ScoringDisplay
            financialScore={scoring.financialScore}
            capabilityScore={scoring.capabilityScore}
            strategicScore={scoring.strategicScore}
            overallScore={scoring.overallScore}
            recommendation={scoring.recommendation}
            rationale={scoring.rationale}
            conditions={scoring.conditions}
          />
        )}
        {capabilityGaps.length > 0 && <CapabilityGaps gaps={capabilityGaps} />}
      </div>
    </div>
  );
}
