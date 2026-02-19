
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { clientLogger } from '@/lib/client-logger';

/**
 * Configuration for the useDataEntry hook
 */
interface UseDataEntryConfig<T> {
    /**
     * Async function to submit data to the API.
     * Should throw an error if submission fails.
     */
    onSubmit: (data: T) => Promise<unknown>;

    /**
     * Callback to run after successful submission (e.g., refresh list).
     */
    onSuccess?: (response: unknown) => void;

    /**
     * Custom success message.
     */
    successMessage?: string;

    /**
     * Custom error message or generic "Failed" message.
     */
    errorMessage?: string;
}

/**
 * Enterprise-grade hook for managing Data Entry Forms (Modal opening, Submitting, Error handling).
 */
export function useDataEntry<T>({
    onSubmit,
    onSuccess,
    successMessage = 'Saved successfully',
    errorMessage = 'Failed to save data',
}: UseDataEntryConfig<T>) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const open = useCallback(() => {
        setIsOpen(true);
        setError(null);
    }, []);

    const close = useCallback(() => {
        if (isSubmitting) return; // Prevent closing while submitting
        setIsOpen(false);
        setError(null);
    }, [isSubmitting]);

    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

    const submit = useCallback(
        async (data: T) => {
            setIsSubmitting(true);
            setError(null);

            try {
                const response = await onSubmit(data);
                toast.success(successMessage);

                if (onSuccess) {
                    onSuccess(response);
                }

                close();
                return true;
            } catch (err: unknown) {
                clientLogger.error('Data Entry Error', err);
                const msg = err instanceof Error ? err.message : errorMessage;
                setError(msg);
                toast.error(msg);
                return false;
            } finally {
                setIsSubmitting(false);
            }
        },
        [onSubmit, onSuccess, successMessage, errorMessage, close]
    );

    return {
        isOpen,
        open,
        close,
        toggle,
        isSubmitting,
        submit,
        error,
    };
}
