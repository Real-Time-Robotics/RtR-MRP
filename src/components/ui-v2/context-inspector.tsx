'use client';

import React from 'react';
import { useSmartGridStore } from './smart-grid';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Database, BarChart3, Bot, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ContextInspector() {
    const { selectedId, selectedItem, setSelectedId, isInspectorOpen, toggleInspector } = useSmartGridStore();

    if (!isInspectorOpen) return null;

    // Defensive check: If opened but no item, show empty or loading?
    if (!selectedId && !selectedItem) {
        return (
            <div className="h-full bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex items-center justify-center p-4">
                <div className="text-center text-slate-400">
                    <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Select an item to view details</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <h3 className="font-semibold text-sm dark:text-slate-200">Context Inspector</h3>
                </div>
                <Button variant="ghost" size="icon" className="hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setSelectedId(null)} aria-label="Đóng">
                    <X className="h-4 w-4 dark:text-slate-400" />
                </Button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    {/* Active Item Context */}
                    <Card className="dark:bg-slate-950 dark:border-slate-800 shadow-none border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Selected Item</CardTitle>
                            <div className="font-mono text-lg font-bold text-primary truncate" title={String(selectedItem?.partNumber ?? selectedId ?? '')}>
                                {String(selectedItem?.partNumber ?? selectedId ?? 'None')}
                            </div>
                            {selectedItem?.name ? (
                                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {String(selectedItem.name)}
                                </div>
                            ) : null}
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="text-slate-500 dark:text-slate-400 block">Quantity</span>
                                <span className="font-medium dark:text-white">{String(selectedItem?.quantity ?? '-')}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 dark:text-slate-400 block">Available</span>
                                <span className="font-medium dark:text-white">{String(selectedItem?.available ?? '-')}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 dark:text-slate-400 block">Status</span>
                                <span className="font-medium dark:text-white">{String(selectedItem?.status ?? '-')}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 dark:text-slate-400 block">Warehouse</span>
                                <span className="font-medium dark:text-white">{String(selectedItem?.warehouseName ?? 'Default')}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="db" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 h-9">
                            <TabsTrigger
                                value="db"
                                className="text-xs h-7 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-50 data-[state=active]:shadow-sm"
                            >
                                Data
                            </TabsTrigger>
                            <TabsTrigger
                                value="report"
                                className="text-xs h-7 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-50 data-[state=active]:shadow-sm"
                            >
                                Report
                            </TabsTrigger>
                            <TabsTrigger
                                value="copilot"
                                className="text-xs h-7 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-50 data-[state=active]:shadow-sm"
                            >
                                Copilot
                            </TabsTrigger>
                        </TabsList>

                        {/* Database View - Excel Style */}
                        <TabsContent value="db" className="mt-4 space-y-2">
                            {/* Excel-like Header Bar */}
                            <div className="flex items-center gap-2 px-2 py-1.5 bg-[#217346] rounded-t-md">
                                <Database className="h-3.5 w-3.5 text-white" />
                                <span className="text-xs font-medium text-white">Database Record</span>
                                <span className="ml-auto text-[10px] text-white/70 font-mono">
                                    {String(selectedItem?.partNumber ?? selectedId ?? 'record')}
                                </span>
                            </div>

                            {/* Excel-like Table */}
                            <div className="border border-[#217346]/30 rounded-b-md overflow-hidden">
                                {/* Column Headers */}
                                <div className="grid grid-cols-[32px_1fr_1fr] bg-[#E2EFDA] dark:bg-[#217346]/20 border-b border-[#217346]/30">
                                    <div className="px-1 py-1.5 text-[10px] font-semibold text-[#217346] dark:text-[#70AD47] text-center border-r border-[#217346]/20"></div>
                                    <div className="px-2 py-1.5 text-[10px] font-semibold text-[#217346] dark:text-[#70AD47] border-r border-[#217346]/20">A - Field</div>
                                    <div className="px-2 py-1.5 text-[10px] font-semibold text-[#217346] dark:text-[#70AD47]">B - Value</div>
                                </div>

                                {/* Data Rows */}
                                <div className="max-h-[400px] overflow-auto bg-white dark:bg-slate-950">
                                    {selectedItem ? (
                                        Object.entries(selectedItem).map(([key, value], index) => (
                                            <div
                                                key={key}
                                                className={cn(
                                                    "grid grid-cols-[32px_1fr_1fr] border-b border-slate-200 dark:border-slate-800 last:border-b-0",
                                                    "hover:bg-[#E2EFDA]/50 dark:hover:bg-[#217346]/10 transition-colors"
                                                )}
                                            >
                                                {/* Row Number */}
                                                <div className="px-1 py-1.5 text-[10px] text-slate-400 dark:text-slate-500 text-center bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-mono">
                                                    {index + 1}
                                                </div>
                                                {/* Field Name */}
                                                <div className="px-2 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 font-mono truncate" title={key}>
                                                    {key}
                                                </div>
                                                {/* Value */}
                                                <div className="px-2 py-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-mono truncate" title={String(value)}>
                                                    {typeof value === 'boolean' ? (
                                                        <span className={value ? 'text-[#217346]' : 'text-red-500'}>{String(value)}</span>
                                                    ) : typeof value === 'number' ? (
                                                        <span className="text-blue-600 dark:text-blue-400">{value}</span>
                                                    ) : value === null || value === undefined ? (
                                                        <span className="text-slate-400 italic">null</span>
                                                    ) : (
                                                        String(value)
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-8 text-center text-xs text-slate-400">
                                            No data available
                                        </div>
                                    )}
                                </div>

                                {/* Excel-like Footer */}
                                <div className="flex items-center justify-between px-2 py-1 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        {selectedItem ? Object.keys(selectedItem).length : 0} fields
                                    </span>
                                    <span className="text-[10px] text-[#217346] dark:text-[#70AD47] font-medium">
                                        Sheet1
                                    </span>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Instant Report */}
                        <TabsContent value="report" className="mt-4 space-y-4">
                            {!selectedItem?.id ? (
                                <div className="text-xs text-slate-500 py-4 text-center">No report data available for this item.</div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 text-sm font-semibold dark:text-slate-200">
                                        <BarChart3 className="h-4 w-4" />
                                        Usage Trends <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-500">(Mock)</span>
                                    </div>
                                    <div className="h-[150px] bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-md flex flex-col items-center justify-center text-xs text-slate-400 gap-1">
                                        <BarChart3 className="h-6 w-6 opacity-20" />
                                        <span>Historical data not connected</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-semibold dark:text-slate-200">
                                        <History className="h-4 w-4" />
                                        Audit Log <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-500">(Mock)</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-xs bg-white dark:bg-black p-2 rounded border border-slate-100 dark:border-slate-800">
                                            <div className="font-semibold dark:text-slate-200">System</div>
                                            <div className="text-slate-500 dark:text-slate-400">Created record</div>
                                            <div className="text-[10px] text-slate-400">Today</div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </TabsContent>

                        {/* AI Copilot */}
                        <TabsContent value="copilot" className="mt-4 space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 p-3 rounded-md">
                                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold text-sm mb-1">
                                    <Bot className="h-4 w-4" />
                                    AI Insight
                                </div>
                                <p className="text-xs text-blue-600 dark:text-blue-300">
                                    {Number(selectedItem?.quantity ?? 0) < Number(selectedItem?.safetyStock ?? 0)
                                        ? "This part is below safety stock levels. Consider ordering more."
                                        : "Stock levels appear healthy based on current consumption trends."}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Input placeholder="Ask Copilot..." className="text-xs dark:bg-slate-950 dark:border-slate-800" />
                                <Button size="sm">Ask</Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </ScrollArea>
        </div>
    );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={cn("flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", props.className)} />
}
import { cn } from "@/lib/utils";
