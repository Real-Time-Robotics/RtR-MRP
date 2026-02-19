'use client';

import React from 'react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PartFormTabProps } from './types';

export function PartFormPhysicalTab({ form, t }: PartFormTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="weightKg"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partForm.weightKg')}</FormLabel>
              <FormControl>
                <Input type="number" min={0} step={0.001} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="material"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partForm.material')}</FormLabel>
              <FormControl>
                <Input placeholder="Aluminum, Steel, Plastic..." {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="lengthMm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partForm.lengthMm')}</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="widthMm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partForm.widthMm')}</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="heightMm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partForm.heightMm')}</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="color"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('partForm.color')}</FormLabel>
            <FormControl>
              <Input placeholder="Black, White, Silver..." {...field} value={field.value || ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
