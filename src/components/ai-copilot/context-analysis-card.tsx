
import React from 'react';
import { usePartAnalysis } from '@/hooks/use-part-analysis';
import { Loader2, Package, Truck, Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import { QuickActionButton } from './smart-action-executor';
import { useRouter } from 'next/navigation';
import { SupplierAnalysisCard, CustomerAnalysisCard } from './entity-cards';

interface ContextAnalysisCardProps {
    // Legacy support
    partId?: string;
    partName?: string;
    partNumber?: string;

    // Generic support
    selectedItem?: Record<string, unknown>;
    type?: 'part' | 'supplier' | 'customer' | 'order' | 'production' | 'general';
    onClose?: () => void;
}

// Inner component for Part Analysis (Old logic moved here)
function PartAnalysisView({ partId, partName, partNumber }: { partId: string, partName: string, partNumber: string }) {
    const { analysis, isLoading } = usePartAnalysis(partId);
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-900 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-16 bg-slate-200 rounded"></div>
                    <div className="h-16 bg-slate-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!analysis) {
        return (
            <div className="p-4 border border-red-200 rounded-xl bg-red-50 dark:bg-red-900/10">
                <p className="text-xs text-red-600 font-mono">Analysis Unavailable</p>
                <p className="text-[10px] text-red-400">PartID: {partId}</p>
            </div>
        );
    }

    const isLowStock = analysis.stock.available < analysis.stock.reorderPoint;
    const isCritical = analysis.stock.available < analysis.stock.safetyStock;

    return (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-950 shadow-sm overflow-hidden font-mono text-sm">
            {/* Header */}
            <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 flex justify-between items-center">
                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                        {partNumber}
                    </span>
                    <span className="text-[10px] text-neutral-500 truncate max-w-[200px]" title={partName}>
                        {partName}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {isCritical && (
                        <span className="animate-pulse w-2 h-2 rounded-full bg-red-500" title="Critical Stock"></span>
                    )}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${isLowStock
                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900'
                        }`}>
                        {isLowStock ? 'LOW STOCK' : 'HEALTHY'}
                    </span>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-3 divide-x divide-neutral-200 dark:divide-neutral-800 border-b border-neutral-200 dark:border-neutral-800">
                {/* Available */}
                <div className="p-2 flex flex-col items-center justify-center">
                    <span className="text-[9px] text-neutral-500 uppercase tracking-widest">Available</span>
                    <span className={`text-base font-bold ${isLowStock ? 'text-red-600' : 'text-neutral-900 dark:text-neutral-100'}`}>
                        {analysis.stock.available}
                    </span>
                </div>
                {/* Inbound */}
                <div className="p-2 flex flex-col items-center justify-center">
                    <span className="text-[9px] text-neutral-500 uppercase tracking-widest">Inbound</span>
                    <span className="text-base font-bold text-blue-600">
                        {analysis.inbound.totalIncoming}
                    </span>
                </div>
                {/* Usage */}
                <div className="p-2 flex flex-col items-center justify-center">
                    <span className="text-[9px] text-neutral-500 uppercase tracking-widest">Usage 30d</span>
                    <span className="text-base font-bold text-neutral-700 dark:text-neutral-300">
                        {analysis.usage.monthlyAverage}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="p-2 bg-neutral-50 dark:bg-neutral-900/50">
                <button
                    onClick={() => {
                        const params = new URLSearchParams({
                            action: 'create',
                            partId: partId,
                            quantity: Math.max(analysis.stock.reorderPoint - analysis.stock.available, 50).toString(),
                            notes: 'Auto-generated from Copilot Context'
                        });
                        router.push(`/purchasing?${params.toString()}`);
                    }}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:bg-gradient-to-r dark:from-neutral-800 dark:to-neutral-700 dark:hover:from-neutral-700 dark:hover:to-neutral-600 text-white text-xs py-2 rounded flex items-center justify-center gap-2 transition-colors"
                >
                    <Truck className="h-3 w-3" />
                    <span>Restock Now</span>
                </button>
            </div>
        </div>
    );
}

export function ContextAnalysisCard({ partId, partName, partNumber, selectedItem, type, onClose }: ContextAnalysisCardProps) {
    // If explicit type is provided, use it
    if (type === 'supplier' && selectedItem) {
        return <SupplierAnalysisCard supplier={selectedItem as unknown as { id: string; name: string; code: string; status?: string }} />;
    }

    if (type === 'customer' && selectedItem) {
        return <CustomerAnalysisCard customer={selectedItem as unknown as { id: string; name: string; code: string; type?: string; creditLimit?: number }} />;
    }

    if (type === 'order' && selectedItem) {
        const orderItem = selectedItem as Record<string, unknown>;
        const customer = orderItem.customer as { name?: string } | undefined;
        const lines = orderItem.lines as Array<{ quantity: number; unitPrice: number }> | undefined;
        return (
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-950 shadow-sm overflow-hidden font-mono text-sm">
                <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 flex justify-between items-center">
                    <span className="font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">{String(orderItem.orderNumber ?? '')}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">{String(orderItem.status ?? '')}</span>
                </div>
                <div className="p-3">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-neutral-500">Customer</span>
                        <span className="text-xs font-bold">{customer?.name ?? ''}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-neutral-500">Total</span>
                        <span className="text-sm font-bold">${lines?.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0).toFixed(2) ?? '0.00'}</span>
                    </div>
                </div>
            </div>
        );
    }

    // Default fallbacks for Parts (Legacy + New)
    // Heuristic: If it has partNumber or is marked as 'part'
    if (type === 'part' || partId || (selectedItem && selectedItem.partNumber)) {
        const id = partId || (selectedItem?.id as string | undefined);
        const number = partNumber || (selectedItem?.partNumber as string | undefined);
        const name = partName || (selectedItem?.name as string | undefined);

        if (id) {
            return <PartAnalysisView partId={id} partNumber={number ?? ''} partName={name ?? ''} />;
        }
    }

    // Fallback for unknown selection
    // Generic/production fallback
    if (type === 'production' && selectedItem) {
        const prodItem = selectedItem as Record<string, unknown>;
        return (
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-950 shadow-sm overflow-hidden font-mono text-sm">
                <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-purple-50 dark:bg-purple-900/20 flex justify-between items-center">
                    <span className="font-bold text-purple-900 dark:text-purple-100 tracking-tight">Work Order</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-white dark:bg-black">{String(prodItem.woNumber ?? '') || 'ID: ' + String(prodItem.id ?? '').substring(0, 6)}</span>
                </div>
                <div className="p-3">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-neutral-500">Status</span>
                        <span className="text-xs font-bold">{String(prodItem.status ?? '')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-neutral-500">Qty</span>
                        <span className="text-sm font-bold">{String(prodItem.quantity ?? '')}</span>
                    </div>
                </div>
            </div>
        )
    }

    if (selectedItem) {
        return (
            <div className="p-3 border border-dashed border-neutral-300 rounded-lg text-center">
                <p className="text-xs text-neutral-500">Analysis Not Available</p>
                <p className="text-[10px] text-neutral-400 mt-1 font-mono">Type: {type || 'Unknown'}</p>
                <p className="text-[10px] text-neutral-400 font-mono">ID: {String(selectedItem.id ?? '')}</p>
            </div>
        );
    }

    return null;
}
