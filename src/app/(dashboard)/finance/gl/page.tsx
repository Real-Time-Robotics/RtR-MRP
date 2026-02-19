"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  FileText,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartOfAccounts, JournalEntryForm, TrialBalance } from "@/components/finance";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { clientLogger } from '@/lib/client-logger';

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
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  reference?: string;
  status: string;
  lines: Array<{
    id: string;
    lineNumber: number;
    account: { accountNumber: string; name: string };
    description?: string;
    debitAmount: number;
    creditAmount: number;
  }>;
  createdByUser?: { name: string };
  postedByUser?: { name: string };
  postedAt?: string;
}

interface TrialBalanceData {
  asOfDate: string;
  accounts: Array<{
    accountId: string;
    accountNumber: string;
    accountName: string;
    accountType: string;
    debitBalance: number;
    creditBalance: number;
  }>;
  totalDebits: number;
  totalCredits: number;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
    </div>
  );
}

function GeneralLedgerContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "accounts";
  const showNew = searchParams.get("new") === "true";

  const [tab, setTab] = useState(initialTab);
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newJournalOpen, setNewJournalOpen] = useState(showNew);
  const [submitting, setSubmitting] = useState(false);
  const [editingAccount, setEditingAccount] = useState<GLAccount | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsRes, journalsRes, tbRes] = await Promise.all([
        fetch("/api/finance/gl/accounts"),
        fetch("/api/finance/gl/journals"),
        fetch("/api/finance/gl/accounts?action=trial-balance"),
      ]);

      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data.accounts || []);
      }

      if (journalsRes.ok) {
        const data = await journalsRes.json();
        setJournals(
          (data.journals || []).map((j: Record<string, unknown>) => ({
            ...j,
            lines: ((j.lines as Array<Record<string, unknown>>) || []).map(
              (l: Record<string, unknown>) => ({
                ...l,
                debitAmount: Number(l.debitAmount) || 0,
                creditAmount: Number(l.creditAmount) || 0,
              })
            ),
          }))
        );
      }

      if (tbRes.ok) {
        const data = await tbRes.json();
        if (data.trialBalance) {
          setTrialBalance({
            ...data.trialBalance,
            accounts: data.trialBalance.accounts.map(
              (a: Record<string, unknown>) => ({
                ...a,
                debitBalance: Number(a.debitBalance) || 0,
                creditBalance: Number(a.creditBalance) || 0,
              })
            ),
            totalDebits: Number(data.trialBalance.totalDebits) || 0,
            totalCredits: Number(data.trialBalance.totalCredits) || 0,
          });
        }
      }
    } catch (error) {
      clientLogger.error("Failed to fetch GL data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJournal = async (data: {
    entryDate: string;
    description: string;
    reference?: string;
    lines: Array<{
      accountId: string;
      description?: string;
      debitAmount: number;
      creditAmount: number;
    }>;
    autoPost?: boolean;
  }) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/finance/gl/journals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setNewJournalOpen(false);
        await fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create journal entry");
      }
    } catch (error) {
      clientLogger.error("Failed to create journal:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostJournal = async (journalId: string) => {
    try {
      const res = await fetch("/api/finance/gl/journals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journalId, action: "post" }),
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      clientLogger.error("Failed to post journal:", error);
    }
  };

  const handleEditAccount = (account: GLAccount) => {
    setEditingAccount(account);
    setEditForm({ name: account.name, description: account.description || "" });
  };

  const handleSaveAccount = async () => {
    if (!editingAccount) return;
    setEditSubmitting(true);
    try {
      const res = await fetch("/api/finance/gl/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: editingAccount.id,
          name: editForm.name,
          description: editForm.description,
        }),
      });

      if (res.ok) {
        setEditingAccount(null);
        await fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update account");
      }
    } catch (error) {
      clientLogger.error("Failed to update account:", error);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return;

    try {
      const res = await fetch(`/api/finance/gl/accounts?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      clientLogger.error("Failed to delete account:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "POSTED":
        return (
          <Badge className="bg-success-100 text-success-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Posted
          </Badge>
        );
      case "DRAFT":
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        );
      case "VOIDED":
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            Voided
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="General Ledger"
        description="Chart of Accounts, Journal Entries & Trial Balance"
        actions={
          <Button onClick={() => setNewJournalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Journal Entry
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Chart of Accounts
          </TabsTrigger>
          <TabsTrigger value="journals" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Journal Entries
          </TabsTrigger>
          <TabsTrigger value="trial-balance" className="flex items-center gap-2">
            Trial Balance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Chart of Accounts</CardTitle>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </CardHeader>
            <CardContent>
              <ChartOfAccounts
                accounts={accounts}
                onEdit={handleEditAccount}
                onDelete={handleDeleteAccount}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journals">
          <Card>
            <CardHeader>
              <CardTitle>Journal Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entry #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Debits</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journals.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground"
                        >
                          No journal entries found
                        </TableCell>
                      </TableRow>
                    ) : (
                      journals.map((journal) => {
                        const totalDebits = journal.lines.reduce(
                          (sum, l) => sum + l.debitAmount,
                          0
                        );
                        const totalCredits = journal.lines.reduce(
                          (sum, l) => sum + l.creditAmount,
                          0
                        );
                        return (
                          <TableRow key={journal.id}>
                            <TableCell className="font-mono font-medium">
                              {journal.entryNumber}
                            </TableCell>
                            <TableCell>
                              {format(new Date(journal.entryDate), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {journal.description}
                            </TableCell>
                            <TableCell>{journal.reference || "-"}</TableCell>
                            <TableCell className="text-right">
                              $
                              {totalDebits.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className="text-right">
                              $
                              {totalCredits.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell>{getStatusBadge(journal.status)}</TableCell>
                            <TableCell className="text-right">
                              {journal.status === "DRAFT" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePostJournal(journal.id)}
                                >
                                  Post
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trial-balance">
          {trialBalance ? (
            <TrialBalance
              asOfDate={trialBalance.asOfDate}
              accounts={trialBalance.accounts}
              totalDebits={trialBalance.totalDebits}
              totalCredits={trialBalance.totalCredits}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-12">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No trial balance data available</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* New Journal Entry Dialog */}
      <Dialog open={newJournalOpen} onOpenChange={setNewJournalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Journal Entry</DialogTitle>
          </DialogHeader>
          <JournalEntryForm
            accounts={accounts}
            onSubmit={handleCreateJournal}
            onCancel={() => setNewJournalOpen(false)}
            isSubmitting={submitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog
        open={!!editingAccount}
        onOpenChange={(open) => { if (!open) setEditingAccount(null); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          {editingAccount && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Account Number</p>
                <p className="font-mono">{editingAccount.accountNumber}</p>
              </div>
              <div>
                <label htmlFor="edit-name" className="text-sm font-medium">
                  Name
                </label>
                <input
                  id="edit-name"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="edit-desc" className="text-sm font-medium">
                  Description
                </label>
                <input
                  id="edit-desc"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingAccount(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveAccount} disabled={editSubmitting || !editForm.name.trim()}>
                  {editSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function GeneralLedgerPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GeneralLedgerContent />
    </Suspense>
  );
}
