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
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface TrialBalanceAccount {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
}

interface TrialBalanceProps {
  asOfDate: string;
  accounts: TrialBalanceAccount[];
  totalDebits: number;
  totalCredits: number;
}

export function TrialBalance({
  asOfDate,
  accounts,
  totalDebits,
  totalCredits,
}: TrialBalanceProps) {
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const formatCurrency = (value: number) => {
    if (value === 0) return "-";
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      ASSET: "bg-blue-100 text-blue-800",
      LIABILITY: "bg-red-100 text-red-800",
      EQUITY: "bg-purple-100 text-purple-800",
      REVENUE: "bg-green-100 text-green-800",
      EXPENSE: "bg-orange-100 text-orange-800",
    };
    return <Badge className={variants[type] || ""}>{type}</Badge>;
  };

  // Group accounts by type
  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.accountType]) {
      acc[account.accountType] = [];
    }
    acc[account.accountType].push(account);
    return acc;
  }, {} as Record<string, TrialBalanceAccount[]>);

  const accountTypeOrder = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Trial Balance</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            As of {new Date(asOfDate).toLocaleDateString()}
          </p>
        </div>
        {isBalanced ? (
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            Balanced
          </Badge>
        ) : (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Out of Balance
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account #</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accountTypeOrder.map((type) => {
                const typeAccounts = groupedAccounts[type] || [];
                if (typeAccounts.length === 0) return null;

                return typeAccounts.map((account, index) => (
                  <TableRow key={account.accountId}>
                    <TableCell className="font-mono">
                      {account.accountNumber}
                    </TableCell>
                    <TableCell>{account.accountName}</TableCell>
                    <TableCell>{index === 0 && getTypeBadge(type)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(account.debitBalance)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(account.creditBalance)}
                    </TableCell>
                  </TableRow>
                ));
              })}
              {/* Totals Row */}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={3} className="text-right">
                  Totals
                </TableCell>
                <TableCell className="text-right">
                  ${totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right">
                  ${totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
              {!isBalanced && (
                <TableRow className="bg-red-50">
                  <TableCell colSpan={3} className="text-right text-red-600">
                    Difference
                  </TableCell>
                  <TableCell colSpan={2} className="text-right text-red-600 font-bold">
                    ${Math.abs(totalDebits - totalCredits).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
