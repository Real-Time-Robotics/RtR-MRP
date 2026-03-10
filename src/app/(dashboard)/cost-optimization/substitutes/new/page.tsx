"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import { PartSelector } from "@/components/cost-optimization/make-vs-buy/part-selector";
import { SubstituteResults } from "@/components/cost-optimization/substitutes/substitute-results";
import { useSubstituteSearch } from "@/hooks/cost-optimization/use-substitutes";

export default function NewSubstitutePage() {
  const router = useRouter();
  const [originalPartId, setOriginalPartId] = useState("");
  const [selectedPart, setSelectedPart] = useState<{
    partNumber: string;
    name: string;
  } | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: searchData, isLoading } = useSubstituteSearch(
    originalPartId || null
  );

  const handleCreateEvaluation = async (substituteId: string) => {
    if (!originalPartId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/cost-optimization/substitutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalPartId, substitutePartId: substituteId }),
      });
      if (res.ok) {
        const evaluation = await res.json();
        router.push(`/cost-optimization/substitutes/${evaluation.id}`);
      }
    } catch {
      // ignore
    }
    setCreating(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tim linh kien thay the"
        description="Chon part goc de tim cac phuong an thay the re hon"
        backHref="/cost-optimization/substitutes"
      />

      {/* Part Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4" />
            Chon linh kien goc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PartSelector
            value={originalPartId}
            onChange={(id, part) => {
              setOriginalPartId(id);
              if (part) {
                setSelectedPart({
                  partNumber: part.partNumber,
                  name: part.name,
                });
              }
            }}
          />
          {selectedPart && (
            <div className="mt-2 text-sm text-muted-foreground">
              Da chon: <span className="font-mono">{selectedPart.partNumber}</span>{" "}
              — {selectedPart.name}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      {originalPartId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Ket qua tim kiem
              {searchData && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({searchData.count} ket qua)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : searchData ? (
              <SubstituteResults
                originalPrice={searchData.originalPart.price}
                results={searchData.substitutes}
                onCreateEvaluation={handleCreateEvaluation}
              />
            ) : null}
            {creating && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">Dang tao danh gia...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
