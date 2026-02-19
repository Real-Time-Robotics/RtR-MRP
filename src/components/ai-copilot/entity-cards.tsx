
import React from 'react';
import { useRouter } from 'next/navigation';
import { Truck, ShoppingCart, DollarSign, Activity } from 'lucide-react';

interface SupplierAnalysisCardProps {
    supplier: { id: string; name: string; code: string; status?: string };
}

export function SupplierAnalysisCard({ supplier }: SupplierAnalysisCardProps) {
    const router = useRouter();

    // Fake computed metrics (replacing real analysis hook for now)
    const activePOs = Math.floor(Math.random() * 5);
    const onTimeDelivery = 92 + Math.floor(Math.random() * 8); // 92-100%
    const spendYTD = 154200;

    const handleCreatePO = () => {
        const params = new URLSearchParams({
            mode: 'create',
            supplierId: supplier.id,
            supplierName: supplier.name
        });
        router.push(`/purchasing?${params.toString()}`);
    };

    return (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-950 shadow-sm overflow-hidden font-mono text-sm">
            {/* Header */}
            <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 flex justify-between items-center">
                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-neutral-900 dark:text-neutral-100 tracking-tight text-xs">
                        {supplier.code}
                    </span>
                    <span className="text-[10px] text-neutral-500 truncate max-w-[200px]" title={supplier.name}>
                        {supplier.name}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400">
                        {supplier.status?.toUpperCase() || 'ACTIVE'}
                    </span>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 divide-x divide-neutral-200 dark:divide-neutral-800 border-b border-neutral-200">
                <div className="p-2 flex flex-col items-center">
                    <span className="text-[9px] text-neutral-500 uppercase">On-Time</span>
                    <span className="text-base font-bold text-emerald-600">{onTimeDelivery}%</span>
                </div>
                <div className="p-2 flex flex-col items-center">
                    <span className="text-[9px] text-neutral-500 uppercase">Active POs</span>
                    <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">{activePOs}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="p-2 flex gap-2">
                <button
                    onClick={handleCreatePO}
                    className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white text-xs py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors"
                >
                    <ShoppingCart className="h-3 w-3" />
                    <span>Create PO</span>
                </button>
                <button className="flex-1 border border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors">
                    <Activity className="h-3 w-3" />
                    <span>Audit</span>
                </button>
            </div>
        </div>
    );
}

interface CustomerAnalysisCardProps {
    customer: { id: string; name: string; code: string; type?: string; creditLimit?: number };
}

export function CustomerAnalysisCard({ customer }: CustomerAnalysisCardProps) {
    const router = useRouter();

    const creditLimit = customer.creditLimit || 50000;
    const currentBalance = Math.floor(Math.random() * 10000);
    const utilization = Math.round((currentBalance / creditLimit) * 100);

    const handleCreateOrder = () => {
        const params = new URLSearchParams({
            mode: 'create',
            customerId: customer.id,
            customerName: customer.name
        });
        router.push(`/sales?${params.toString()}`);
    }

    return (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-950 shadow-sm overflow-hidden font-mono text-sm">
            {/* Header */}
            <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 flex justify-between items-center">
                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-neutral-900 dark:text-neutral-100 tracking-tight text-xs">
                        {customer.code}
                    </span>
                    <span className="text-[10px] text-neutral-500 truncate max-w-[200px]" title={customer.name}>
                        {customer.name}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400">
                        {customer.type || 'Standard'}
                    </span>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 divide-x divide-neutral-200 dark:divide-neutral-800 border-b border-neutral-200">
                <div className="p-2 flex flex-col items-center">
                    <span className="text-[9px] text-neutral-500 uppercase">Credit Util</span>
                    <span className={`text-base font-bold ${utilization > 80 ? 'text-red-600' : 'text-emerald-600'}`}>{utilization}%</span>
                </div>
                <div className="p-2 flex flex-col items-center">
                    <span className="text-[9px] text-neutral-500 uppercase">Risk Score</span>
                    <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">Low</span>
                </div>
            </div>

            {/* Actions */}
            <div className="p-2 flex gap-2">
                <button
                    onClick={handleCreateOrder}
                    className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white text-xs py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors"
                >
                    <ShoppingCart className="h-3 w-3" />
                    <span>New Order</span>
                </button>
            </div>
        </div>
    );
}
