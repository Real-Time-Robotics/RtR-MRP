'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

const lineSchema = z.object({
  partId: z.string().optional().nullable(),
  itemDescription: z.string().min(1, 'Description required'),
  itemCode: z.string().optional().nullable(),
  requestedQty: z.number().positive('Must be > 0'),
  unit: z.string().min(1),
  estimatedPrice: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
});

const formSchema = z.object({
  title: z.string().min(1, 'Title required').max(200),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL']),
  requiredDate: z.string().min(1, 'Required date is required'),
  budgetCode: z.string().optional(),
  costCenter: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'At least one line required'),
});

export type PRFormValues = z.infer<typeof formSchema>;

interface PRFormProps {
  initialData?: PRFormValues;
  prId?: string;
}

export function PRForm({ initialData, prId }: PRFormProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const form = useForm<PRFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ?? {
      title: '',
      description: '',
      priority: 'NORMAL',
      requiredDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      budgetCode: '',
      costCenter: '',
      lines: [
        { itemDescription: '', requestedQty: 1, unit: 'EA', estimatedPrice: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  const watchedLines = form.watch('lines');
  const total = watchedLines.reduce((s, l) => {
    const q = Number(l.requestedQty) || 0;
    const p = Number(l.estimatedPrice) || 0;
    return s + q * p;
  }, 0);

  const submit = async (data: PRFormValues, andSubmit = false) => {
    setBusy(true);
    try {
      const url = prId ? `/api/purchasing/pr/${prId}` : '/api/purchasing/pr';
      const method = prId ? 'PATCH' : 'POST';
      const payload = {
        ...data,
        requiredDate: new Date(data.requiredDate).toISOString(),
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Failed to save PR');
        return;
      }
      const savedId = prId ?? json.data.id;
      if (andSubmit) {
        const submitRes = await fetch(`/api/purchasing/pr/${savedId}/submit`, {
          method: 'POST',
        });
        const submitJson = await submitRes.json();
        if (!submitRes.ok || !submitJson.success) {
          toast.error(submitJson.error ?? 'Saved, but submit failed');
        } else {
          toast.success('PR submitted for approval');
        }
      } else {
        toast.success(prId ? 'PR updated' : 'PR created');
      }
      router.push('/purchasing/pr');
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{prId ? 'Edit Purchase Request' : 'New Purchase Request'}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief PR title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {['LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL'].map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requiredDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Required Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budgetCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. BUD-2026-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="costCenter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Center</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. CC-PROD-01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Notes / context…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  itemDescription: '',
                  requestedQty: 1,
                  unit: 'EA',
                  estimatedPrice: 0,
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Add Line
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-12 gap-2 items-end border-b pb-3">
                <div className="col-span-1 text-center font-mono text-sm text-muted-foreground pb-2">
                  #{i + 1}
                </div>
                <FormField
                  control={form.control}
                  name={`lines.${i}.itemDescription`}
                  render={({ field }) => (
                    <FormItem className="col-span-4">
                      {i === 0 && <FormLabel>Description *</FormLabel>}
                      <FormControl>
                        <Input placeholder="Item description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lines.${i}.requestedQty`}
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      {i === 0 && <FormLabel>Qty *</FormLabel>}
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={field.value}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lines.${i}.unit`}
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      {i === 0 && <FormLabel>Unit</FormLabel>}
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {['EA', 'KG', 'M', 'L', 'BOX', 'SET'].map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lines.${i}.estimatedPrice`}
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      {i === 0 && <FormLabel>Est. Price</FormLabel>}
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={field.value ?? 0}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lines.${i}.notes`}
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      {i === 0 && <FormLabel>Notes</FormLabel>}
                      <FormControl>
                        <Input placeholder="—" {...field} value={field.value ?? ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="col-span-1 flex justify-end pb-2">
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(i)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <div className="text-right text-lg font-semibold pt-2">
              Estimated Total: {formatCurrency(total)}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={form.handleSubmit((d) => submit(d, false))}
          >
            <Save className="mr-2 h-4 w-4" /> Save Draft
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={form.handleSubmit((d) => submit(d, true))}
          >
            <Send className="mr-2 h-4 w-4" /> Save &amp; Submit
          </Button>
        </div>
      </form>
    </Form>
  );
}
