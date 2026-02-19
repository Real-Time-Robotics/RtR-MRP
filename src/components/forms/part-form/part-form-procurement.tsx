'use client';

import React from 'react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PartFormTabProps } from './types';

export function PartFormProcurementTab({ form, t }: PartFormTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="makeOrBuy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partForm.makeOrBuy')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="MAKE">{t('makeOrBuy.make')}</SelectItem>
                  <SelectItem value="BUY">{t('makeOrBuy.buy')}</SelectItem>
                  <SelectItem value="BOTH">{t('makeOrBuy.both')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="leadTimeDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partForm.leadTimeDays')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val === '' ? 0 : parseInt(val, 10) || 0);
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="manufacturingStrategy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partForm.manufacturingStrategy')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('partForm.selectStrategy')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="MTS">{t('strategy.mts')}</SelectItem>
                  <SelectItem value="MTO">{t('strategy.mto')}</SelectItem>
                  <SelectItem value="ATO">{t('strategy.ato')}</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>{t('partForm.manufacturingStrategyDesc')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pickingStrategy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partForm.pickingStrategy')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('partForm.selectPicking')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="FIFO">{t('picking.fifo')}</SelectItem>
                  <SelectItem value="FEFO">{t('picking.fefo')}</SelectItem>
                  <SelectItem value="ANY">{t('picking.any')}</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>{t('partForm.pickingStrategyDesc')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="moq"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partForm.moq')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val === '' ? 1 : parseInt(val, 10) || 1);
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormDescription>{t('partForm.moqDesc')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="orderMultiple"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partForm.orderMultiple')}</FormLabel>
              <FormControl>
                <Input type="number" min={1} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="minStockLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partForm.minStockLevel')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val === '' ? 0 : parseInt(val, 10) || 0);
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reorderPoint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partForm.reorderPoint')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val === '' ? 0 : parseInt(val, 10) || 0);
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="safetyStock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partForm.safetyStock')}</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="maxStock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('partForm.maxStock')}</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
