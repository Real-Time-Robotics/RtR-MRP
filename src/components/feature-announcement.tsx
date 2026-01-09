
'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { Keyboard, Table, Zap } from 'lucide-react';

export function FeatureAnnouncement() {
    useEffect(() => {
        // Check if valid
        const hasSeen = localStorage.getItem('rtr-feature-excel-mode-seen');
        if (hasSeen) return;

        // Delay slightly
        const timer = setTimeout(() => {
            toast('Upgrade: Excel Mode Enabled', {
                description: 'Try "Dense View" and Arrow Keys for faster navigation. Ctrl+Enter to save forms.',
                duration: 8000,
                icon: <Zap className="h-4 w-4 text-amber-500" />,
                action: {
                    label: 'Got it',
                    onClick: () => localStorage.setItem('rtr-feature-excel-mode-seen', 'true'),
                },
            });

            // Auto-mark seen after toast triggers to avoid spam if they don't click
            localStorage.setItem('rtr-feature-excel-mode-seen', 'true');
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    return null;
}
