
import { useEffect } from 'react';
import { toast } from 'sonner';

const FEATURE_ID = 'announcement-v15-excel-features';

export function useFeatureAnnouncement() {
    useEffect(() => {
        // Check if already seen
        const hasSeen = localStorage.getItem(FEATURE_ID);
        if (hasSeen) return;

        // Show announcement after a short delay
        const timer = setTimeout(() => {
            toast.message('New Pro Features Available', {
                description: 'Try "Dense Mode" in tables and use "Ctrl+Enter" to save forms instantly.',
                duration: 8000,
                action: {
                    label: 'Got it',
                    onClick: () => {
                        // Dismissal handled automatically
                    },
                },
            });

            // Mark as seen
            localStorage.setItem(FEATURE_ID, 'true');
        }, 1500);

        return () => clearTimeout(timer);
    }, []);
}
