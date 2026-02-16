'use client';

import { useState, useCallback } from 'react';
import { UseFormSetError, FieldValues, Path } from 'react-hook-form';
import { toast } from 'sonner';
import { mutate as swrMutate } from 'swr';

interface UseMutationOptions<TForm extends FieldValues, TResponse> {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  setError?: UseFormSetError<TForm>;
  revalidateKeys?: string[];
  successMessage?: string;
  onSuccess?: (data: TResponse) => void;
  onError?: (error: string) => void;
  transformData?: (data: TForm) => unknown;
}

interface UseMutationReturn<TForm extends FieldValues> {
  mutate: (data?: TForm) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

export function useMutation<TForm extends FieldValues = FieldValues, TResponse = unknown>(
  options: UseMutationOptions<TForm, TResponse>
): UseMutationReturn<TForm> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutateAsync = useCallback(async (data?: TForm) => {
    setIsLoading(true);
    setError(null);

    try {
      const body = data
        ? JSON.stringify(options.transformData ? options.transformData(data) : data)
        : undefined;

      const response = await fetch(options.url, {
        method: options.method || 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body,
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors && options.setError) {
          Object.entries(result.errors).forEach(([field, messages]) => {
            options.setError!(field as Path<TForm>, {
              type: 'server',
              message: (messages as string[]).join(', '),
            });
          });
          return;
        }
        throw new Error(result.message || result.error || 'An error occurred');
      }

      if (options.successMessage) {
        toast.success(options.successMessage);
      }

      if (options.revalidateKeys?.length) {
        options.revalidateKeys.forEach((prefix) => {
          swrMutate((key: string) => typeof key === 'string' && key.startsWith(prefix));
        });
      }

      options.onSuccess?.(result.data ?? result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toast.error(message);
      options.onError?.(message);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  return { mutate: mutateAsync, isLoading, error, reset };
}
