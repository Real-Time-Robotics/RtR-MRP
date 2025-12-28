"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AgingBucket {
  current: number;
  days30: number;
  days60: number;
  days90Plus: number;
  total: number;
}

interface AgingItem {
  entityId: string;
  entityCode: string;
  entityName: string;
  current: number;
  days30: number;
  days60: number;
  days90Plus: number;
  total: number;
}

interface AgingReportProps {
  title: string;
  summary: AgingBucket;
  details: AgingItem[];
  entityLabel: string;
}

export function AgingReport({ title, summary, details, entityLabel }: AgingReportProps) {
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-muted-foreground">Current</div>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(summary.current)}
            </div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-sm text-muted-foreground">1-30 Days</div>
            <div className="text-xl font-bold text-yellow-600">
              {formatCurrency(summary.days30)}
            </div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-muted-foreground">31-60 Days</div>
            <div className="text-xl font-bold text-orange-600">
              {formatCurrency(summary.days60)}
            </div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-sm text-muted-foreground">90+ Days</div>
            <div className="text-xl font-bold text-red-600">
              {formatCurrency(summary.days90Plus)}
            </div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-xl font-bold">{formatCurrency(summary.total)}</div>
          </div>
        </div>

        {/* Detail Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{entityLabel}</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">1-30 Days</TableHead>
                <TableHead className="text-right">31-60 Days</TableHead>
                <TableHead className="text-right">90+ Days</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {details.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No outstanding balances
                  </TableCell>
                </TableRow>
              ) : (
                details.map((item) => (
                  <TableRow key={item.entityId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.entityCode}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.entityName}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.current)}
                    </TableCell>
                    <TableCell className="text-right text-yellow-600">
                      {formatCurrency(item.days30)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(item.days60)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(item.days90Plus)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
