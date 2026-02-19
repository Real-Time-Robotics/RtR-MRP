"use client";

import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GLAccount {
  id: string;
  accountNumber: string;
  name: string;
}

interface JournalLine {
  accountId: string;
  description?: string;
  debitAmount: number;
  creditAmount: number;
}

interface JournalEntryFormProps {
  accounts: GLAccount[];
  onSubmit: (data: {
    entryDate: string;
    description: string;
    reference?: string;
    lines: JournalLine[];
    autoPost?: boolean;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function JournalEntryForm({
  accounts,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: JournalEntryFormProps) {
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [autoPost, setAutoPost] = useState(false);
  const [lines, setLines] = useState<JournalLine[]>([
    { accountId: "", description: "", debitAmount: 0, creditAmount: 0 },
    { accountId: "", description: "", debitAmount: 0, creditAmount: 0 },
  ]);

  const totalDebits = lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
  const totalCredits = lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
  const difference = Math.abs(totalDebits - totalCredits);

  const addLine = () => {
    setLines([
      ...lines,
      { accountId: "", description: "", debitAmount: 0, creditAmount: 0 },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof JournalLine, value: string | number) => {
    const newLines = [...lines];
    if (field === "debitAmount" || field === "creditAmount") {
      newLines[index][field] = Number(value) || 0;
      // Clear the opposite field when entering a value
      if (field === "debitAmount" && value) {
        newLines[index].creditAmount = 0;
      } else if (field === "creditAmount" && value) {
        newLines[index].debitAmount = 0;
      }
    } else {
      newLines[index][field] = value as string;
    }
    setLines(newLines);
  };

  const handleSubmit = () => {
    const validLines = lines.filter(
      (line) => line.accountId && (line.debitAmount > 0 || line.creditAmount > 0)
    );
    if (validLines.length < 2) return;
    if (!isBalanced) return;

    onSubmit({
      entryDate,
      description,
      reference: reference || undefined,
      lines: validLines,
      autoPost,
    });
  };

  const canSubmit =
    entryDate &&
    description &&
    isBalanced &&
    lines.filter((l) => l.accountId && (l.debitAmount > 0 || l.creditAmount > 0)).length >= 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phiếu ghi sổ mới</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Header Fields */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="entryDate">Ngày nhập *</Label>
            <Input
              id="entryDate"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Mã tham chiếu</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="VD: HĐ-001"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoPost}
                onChange={(e) => setAutoPost(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Tự động ghi sổ sau khi lưu</span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Mô tả *</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Nhập mô tả cho phiếu ghi sổ..."
            rows={2}
          />
        </div>

        {/* Journal Lines */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Dòng ghi sổ</Label>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4 mr-1" /> Thêm dòng
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Tài khoản</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead className="w-[150px] text-right">Nợ</TableHead>
                  <TableHead className="w-[150px] text-right">Có</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select
                        value={line.accountId}
                        onValueChange={(value) => updateLine(index, "accountId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn tài khoản" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.accountNumber} - {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.description || ""}
                        onChange={(e) => updateLine(index, "description", e.target.value)}
                        placeholder="Mô tả dòng"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.debitAmount || ""}
                        onChange={(e) => updateLine(index, "debitAmount", e.target.value)}
                        className="text-right"
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.creditAmount || ""}
                        onChange={(e) => updateLine(index, "creditAmount", e.target.value)}
                        className="text-right"
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(index)}
                        disabled={lines.length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={2} className="font-medium text-right">
                    Tổng cộng
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${totalDebits.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${totalCredits.toFixed(2)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {!isBalanced && totalDebits + totalCredits > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Phiếu không cân bằng. Chênh lệch: ${difference.toFixed(2)}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang lưu...
              </>
            ) : (
              "Lưu phiếu ghi sổ"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
