"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Trash2, Search, ChevronRight, ChevronDown } from "lucide-react";

interface GLAccount {
  id: string;
  accountNumber: string;
  name: string;
  description?: string;
  accountType: string;
  accountCategory: string;
  normalBalance: string;
  isActive: boolean;
  isSystemAccount: boolean;
  parentId?: string;
  children?: GLAccount[];
}

interface ChartOfAccountsProps {
  accounts: GLAccount[];
  onEdit: (account: GLAccount) => void;
  onDelete: (id: string) => void;
}

export function ChartOfAccounts({
  accounts,
  onEdit,
  onDelete,
}: ChartOfAccountsProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedAccounts(newExpanded);
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

  // Build hierarchical structure
  const buildHierarchy = (accounts: GLAccount[]): GLAccount[] => {
    const accountMap = new Map<string, GLAccount>();
    const roots: GLAccount[] = [];

    accounts.forEach((account) => {
      accountMap.set(account.id, { ...account, children: [] });
    });

    accounts.forEach((account) => {
      const node = accountMap.get(account.id)!;
      if (account.parentId && accountMap.has(account.parentId)) {
        accountMap.get(account.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const filterAccounts = (accounts: GLAccount[]): GLAccount[] => {
    return accounts.filter((account) => {
      const matchesSearch =
        account.accountNumber.toLowerCase().includes(search.toLowerCase()) ||
        account.name.toLowerCase().includes(search.toLowerCase());
      const matchesType =
        typeFilter === "all" || account.accountType === typeFilter;
      return matchesSearch && matchesType;
    });
  };

  const hierarchy = buildHierarchy(filterAccounts(accounts));

  const renderAccountRow = (account: GLAccount, level: number = 0): React.ReactNode => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedAccounts.has(account.id);

    return (
      <>
        <TableRow key={account.id}>
          <TableCell>
            <div className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 mr-1"
                  onClick={() => toggleExpand(account.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              {!hasChildren && <span className="w-7" />}
              <span className="font-mono">{account.accountNumber}</span>
            </div>
          </TableCell>
          <TableCell>{account.name}</TableCell>
          <TableCell>{getTypeBadge(account.accountType)}</TableCell>
          <TableCell>{account.accountCategory}</TableCell>
          <TableCell>
            <Badge variant={account.normalBalance === "DEBIT" ? "outline" : "secondary"}>
              {account.normalBalance}
            </Badge>
          </TableCell>
          <TableCell>
            {account.isActive ? (
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(account)}
                disabled={account.isSystemAccount}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(account.id)}
                disabled={account.isSystemAccount}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {hasChildren && isExpanded &&
          account.children!.map((child) => renderAccountRow(child, level + 1))
        }
      </>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <div className="relative w-48 lg:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs gap-1 px-2.5">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="ASSET">Assets</SelectItem>
            <SelectItem value="LIABILITY">Liabilities</SelectItem>
            <SelectItem value="EQUITY">Equity</SelectItem>
            <SelectItem value="REVENUE">Revenue</SelectItem>
            <SelectItem value="EXPENSE">Expense</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Normal Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hierarchy.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No accounts found
                </TableCell>
              </TableRow>
            ) : (
              hierarchy.map((account) => renderAccountRow(account))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
