'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSmartGridStore } from './smart-grid';
import { ContextInspector } from './context-inspector';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface SmartLayoutProps {
    children: React.ReactNode;
    className?: string;
}

export function SmartLayout({ children, className }: SmartLayoutProps) {
    const { isInspectorOpen } = useSmartGridStore();
    const [sidebarWidth, setSidebarWidth] = useState(400); // Pixels
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isResizing && containerRef.current) {
                const containerRect = containerRef.current.getBoundingClientRect();
                // Calculate new width from right edge
                const newWidth = containerRect.right - mouseMoveEvent.clientX;

                // Constraints (min 300px, max 80% of screen)
                const maxWidth = containerRect.width * 0.8;
                if (newWidth > 300 && newWidth < maxWidth) {
                    setSidebarWidth(newWidth);
                }
            }
        },
        [isResizing]
    );

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    return (
        <div
            ref={containerRef}
            className={cn("h-[calc(100vh-4rem)] -m-6 flex overflow-hidden relative", className)}
        >
            {/* Main Content Area (Grid) */}
            <div className="flex-1 min-w-0 h-full overflow-hidden p-6 transition-[margin] duration-200 ease-linear">
                {children}
            </div>

            {/* Resize Handle & Inspector */}
            {isInspectorOpen && (
                <>
                    {/* Handle */}
                    <div
                        className={cn(
                            "w-4 cursor-col-resize flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10 select-none -ml-2 border-l border-transparent hover:border-slate-200 dark:hover:border-slate-700",
                            isResizing && "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800"
                        )}
                        onMouseDown={startResizing}
                    >
                        <div className={cn(
                            "h-8 w-1 rounded-full transition-colors",
                            isResizing ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
                        )}>
                            {/* Visual pill */}
                        </div>
                    </div>

                    {/* Inspector Panel */}
                    <div
                        ref={sidebarRef}
                        style={{ width: sidebarWidth }}
                        className="h-full border-l border-slate-200 bg-white dark:bg-slate-900 shadow-xl shrink-0 transition-none" // Disable transition during resize
                    >
                        <ContextInspector />
                    </div>
                </>
            )}
        </div>
    );
}
