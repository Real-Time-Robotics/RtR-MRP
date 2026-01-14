
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui-v2/button';
import { Loader2 } from 'lucide-react';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

interface FormModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;

    /**
     * Text for the submit button. Defaults to "Save".
     */
    submitValidText?: string;

    /**
     * Is the form currently submitting? Disables buttons and shows spinner.
     */
    isSubmitting?: boolean;

    /**
     * Is the form invalid? Disables submit button.
     * If using react-hook-form, pass `!isValid`.
     */
    isInvalid?: boolean;

    /**
     * Function to call when submit button is clicked.
     * Usually `form.handleSubmit(onSubmit)`.
     */
    onSubmit: () => void;

    /**
     * Optional custom footer content (replaces default buttons)
     */
    customFooter?: React.ReactNode;

    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

/**
 * Standardized Modal Wrapper for all Data Entry Forms.
 * Ensures consistent layout, keyboard behavior, and loading states.
 */
export function FormModal({
    isOpen,
    onClose,
    title,
    description,
    children,
    submitValidText = 'Lưu',
    isSubmitting = false,
    isInvalid = false,
    onSubmit,
    customFooter,
    maxWidth = 'md',
}: FormModalProps) {

    const handleOpenChange = (open: boolean) => {
        if (!open && !isSubmitting) {
            onClose();
        }
    };

    const getMaxWidthClass = (size: string) => {
        switch (size) {
            case 'sm': return 'max-w-sm';
            case 'md': return 'max-w-md';
            case 'lg': return 'max-w-lg';
            case 'xl': return 'max-w-xl';
            case '2xl': return 'max-w-2xl';
            case '4xl': return 'max-w-4xl';
            default: return 'max-w-md';
        }
    }

    // Handle Keyboard Shortcuts
    useKeyboardShortcuts({
        'Control+Enter': (e) => {
            if (!isOpen || isSubmitting || isInvalid) return;
            e.preventDefault();
            onSubmit();
        },
        'Meta+Enter': (e) => {
            if (!isOpen || isSubmitting || isInvalid) return;
            e.preventDefault();
            onSubmit();
        }
    });

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent
                className={`${getMaxWidthClass(maxWidth)} dark:bg-slate-900 dark:border-slate-800`}
                preventClose={true}
            >
                <DialogHeader>
                    <DialogTitle className="dark:text-white">{title}</DialogTitle>
                    {description && (
                        <DialogDescription className="dark:text-slate-400">
                            {description}
                        </DialogDescription>
                    )}
                </DialogHeader>

                <div className="py-4 max-h-[70vh] overflow-y-auto">
                    {children}
                </div>

                <DialogFooter>
                    {customFooter ? (
                        customFooter
                    ) : (
                        <div className="flex justify-end gap-2 w-full">
                            <Button
                                variant="secondary"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="dark:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={onSubmit}
                                disabled={isSubmitting || isInvalid}
                                className="min-w-[80px]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        {submitValidText}
                                        <span className="ml-2 text-xs text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 hidden sm:inline-block">
                                            ⌘Enter
                                        </span>
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
