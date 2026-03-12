"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Factory,
  ArrowRightLeft,
  Handshake,
  Wrench,
  Pencil,
  MapPin,
  Trophy,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Contributor {
  rank: number;
  id: string;
  description: string;
  type: string;
  partNumber?: string;
  annualSavings: number;
  status: string;
  ownerName: string;
}

interface TopContributorsTableProps {
  contributors: Contributor[];
}

const TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  MAKE_VS_BUY: { icon: Factory, label: "Make/Buy", color: "text-blue-600" },
  SUBSTITUTE: { icon: ArrowRightLeft, label: "Substitute", color: "text-green-600" },
  SUPPLIER_OPTIMIZE: { icon: Handshake, label: "Supplier", color: "text-purple-600" },
  PROCESS_IMPROVE: { icon: Wrench, label: "Process", color: "text-orange-600" },
  DESIGN_CHANGE: { icon: Pencil, label: "Design", color: "text-pink-600" },
  LOCALIZE: { icon: MapPin, label: "Localize", color: "text-teal-600" },
};

const RANK_COLORS = ["text-yellow-500", "text-gray-400", "text-amber-700"];

export function TopContributorsTable({
  contributors,
}: TopContributorsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Top Savings Contributors
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contributors.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Chua co action nao hoan thanh
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Annual Savings</TableHead>
                  <TableHead>Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributors.map((c) => {
                  const typeConfig =
                    TYPE_CONFIG[c.type] || TYPE_CONFIG.PROCESS_IMPROVE;
                  const TypeIcon = typeConfig.icon;

                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <span
                          className={cn(
                            "font-bold text-lg",
                            c.rank <= 3
                              ? RANK_COLORS[c.rank - 1]
                              : "text-muted-foreground"
                          )}
                        >
                          {c.rank}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{c.description}</div>
                          {c.partNumber && (
                            <div className="text-xs text-muted-foreground font-mono">
                              {c.partNumber}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <TypeIcon
                            className={cn("w-4 h-4", typeConfig.color)}
                          />
                          <span className="text-sm">{typeConfig.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-green-600">
                          {formatCurrency(c.annualSavings)}/yr
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{c.ownerName}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
