'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Upload, Database, ArrowRight, Play, FileSpreadsheet } from 'lucide-react';

interface DataSource {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  ownerDept: string | null;
  status: string;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  mappings: Array<{ id: string; version: number; targetEntity: string }>;
  syncJobs: Array<{ id: string; status: string; rowsRead: number; rowsCreated: number; rowsUpdated: number; rowsError: number; createdAt: string }>;
}

interface PreviewSheet {
  sheetName: string;
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
}

const TARGET_ENTITIES = ['Part', 'Supplier', 'Product', 'WorkOrder'];

export default function DataSourcesPage() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('');

  // Upload + mapping dialog
  const [activeSource, setActiveSource] = useState<DataSource | null>(null);
  const [preview, setPreview] = useState<PreviewSheet[] | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [targetEntity, setTargetEntity] = useState('Part');
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<Record<string, unknown> | null>(null);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/production/data-sources');
    const data = await res.json();
    setSources(data.sources || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  const handleCreate = async () => {
    if (!newCode || !newName) return;
    const res = await fetch('/api/production/data-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: newCode, name: newName, ownerDept: newDept || undefined }),
    });
    if (res.ok) {
      setCreateOpen(false);
      setNewCode('');
      setNewName('');
      setNewDept('');
      fetchSources();
    }
  };

  const handleUpload = async () => {
    if (!activeSource || !uploadFile) return;
    const formData = new FormData();
    formData.append('file', uploadFile);
    const res = await fetch(`/api/production/data-sources/${activeSource.id}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      setPreview(data.sheets || []);
      // Initialize column map from headers
      if (data.sheets?.[0]?.headers) {
        const initial: Record<string, string> = {};
        data.sheets[0].headers.forEach((h: string) => { initial[h] = ''; });
        setColumnMap(initial);
      }
    }
  };

  const handleSaveMapping = async () => {
    if (!activeSource) return;
    const filtered = Object.fromEntries(
      Object.entries(columnMap).filter(([, v]) => v)
    );
    await fetch(`/api/production/data-sources/${activeSource.id}/mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetEntity, columnMappings: filtered }),
    });
  };

  const handleSync = async () => {
    if (!activeSource || !uploadFile) return;
    setSyncing(true);
    await handleSaveMapping();
    const formData = new FormData();
    formData.append('file', uploadFile);
    const res = await fetch(`/api/production/data-sources/${activeSource.id}/sync`, {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      setSyncResult(data.result);
      fetchSources();
    }
    setSyncing(false);
  };

  const STATUS_COLORS: Record<string, string> = {
    success: 'bg-emerald-100 text-emerald-700',
    partial: 'bg-amber-100 text-amber-700',
    fail: 'bg-red-100 text-red-700',
    active: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Data Sources</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Thêm nguồn dữ liệu
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : sources.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Chưa có nguồn dữ liệu nào.</p></CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {sources.map((source) => {
            const lastJob = source.syncJobs[0];
            return (
              <Card key={source.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      {source.code} — {source.name}
                    </CardTitle>
                    <Badge className={STATUS_COLORS[source.status] || ''}>{source.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {source.description && <p className="text-xs text-muted-foreground mb-2">{source.description}</p>}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <Badge variant="outline">{source.type}</Badge>
                    {source.ownerDept && <span>Phòng: {source.ownerDept}</span>}
                    {source.mappings.length > 0 && (
                      <span>→ {source.mappings[0].targetEntity} (v{source.mappings[0].version})</span>
                    )}
                  </div>
                  {lastJob && (
                    <div className="text-xs bg-slate-50 rounded-md p-2 mb-2">
                      <span className="font-medium">Sync gần nhất:</span>{' '}
                      <Badge className={STATUS_COLORS[lastJob.status] || ''} variant="secondary">{lastJob.status}</Badge>{' '}
                      · {lastJob.rowsRead} read · {lastJob.rowsCreated} created · {lastJob.rowsUpdated} updated
                      {lastJob.rowsError > 0 && <span className="text-red-600"> · {lastJob.rowsError} errors</span>}
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => { setActiveSource(source); setPreview(null); setUploadFile(null); setSyncResult(null); }}>
                    <Upload className="h-3 w-3 mr-1" /> Upload + Sync
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm nguồn dữ liệu</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Mã</Label><Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="SX-SHEET-001" /></div>
            <div><Label>Tên</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Bảng sản xuất phòng SX" /></div>
            <div><Label>Phòng ban</Label><Input value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="Sản xuất" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Huỷ</Button>
            <Button onClick={handleCreate} disabled={!newCode || !newName}>Tạo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload + Mapping dialog */}
      <Dialog open={!!activeSource} onOpenChange={(open) => !open && setActiveSource(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Upload + Mapping — {activeSource?.name}</DialogTitle></DialogHeader>

          {/* Step 1: Upload */}
          <div className="space-y-3">
            <Label className="text-base font-medium">1. Chọn file Excel/CSV</Label>
            <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
            <Button onClick={handleUpload} disabled={!uploadFile} variant="outline">
              <Upload className="h-4 w-4 mr-1" /> Upload + Preview
            </Button>
          </div>

          {/* Step 2: Preview */}
          {preview && preview.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">2. Preview ({preview[0].totalRows} dòng, hiện 10 đầu)</Label>
              <div className="overflow-x-auto border rounded-md">
                <table className="text-xs w-full">
                  <thead className="bg-slate-50">
                    <tr>{preview[0].headers.map((h) => <th key={h} className="p-1.5 text-left font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview[0].rows.map((row, i) => (
                      <tr key={i} className="border-t">{preview[0].headers.map((h) => <td key={h} className="p-1.5">{String(row[h] ?? '')}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Step 3: Mapping */}
              <Label className="text-base font-medium">3. Mapping cột <ArrowRight className="h-3 w-3 inline" /> field</Label>
              <div className="mb-2">
                <Label className="text-sm">Target entity</Label>
                <select className="border rounded-md p-2 text-sm w-full" value={targetEntity} onChange={(e) => setTargetEntity(e.target.value)}>
                  {TARGET_ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                {preview[0].headers.map((header) => (
                  <div key={header} className="flex items-center gap-2">
                    <span className="text-sm font-medium min-w-[120px] truncate">{header}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Input
                      className="flex-1"
                      placeholder="target field (vd: partNumber)"
                      value={columnMap[header] || ''}
                      onChange={(e) => setColumnMap((prev) => ({ ...prev, [header]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>

              {/* Step 4: Sync */}
              <Button onClick={handleSync} disabled={syncing} className="w-full">
                <Play className="h-4 w-4 mr-2" /> {syncing ? 'Đang sync...' : 'Apply Mapping + Sync'}
              </Button>

              {syncResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-sm">
                  <p className="font-medium text-emerald-700">Sync hoàn tất!</p>
                  <p>Read: {(syncResult as Record<string, number>).rowsRead} · Created: {(syncResult as Record<string, number>).rowsCreated} · Updated: {(syncResult as Record<string, number>).rowsUpdated} · Errors: {(syncResult as Record<string, number>).rowsError}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
