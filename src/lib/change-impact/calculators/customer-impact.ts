/**
 * Customer Impact Calculator
 * Calculates the impact of changes to a Customer on related entities
 */

import { prisma } from '@/lib/prisma';
import {
  FieldChange,
  ImpactedItem,
  ChangeImpactResult,
  ImpactableEntity,
} from '../types';

export async function calculateCustomerImpact(
  customerId: string,
  changes: FieldChange[]
): Promise<ChangeImpactResult> {
  // Fetch customer with basic info
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      creditLimit: true,
    },
  });

  if (!customer) {
    throw new Error(`Customer not found: ${customerId}`);
  }

  const impactedItems: ImpactedItem[] = [];

  // Check for status changes
  const statusChange = changes.find(c => c.field === 'status');
  if (statusChange && statusChange.newValue === 'inactive') {
    // Get active sales orders for this customer
    const activeSOs = await prisma.salesOrder.findMany({
      where: {
        customerId,
        status: { in: ['draft', 'pending', 'confirmed', 'in_production'] },
      },
      select: { id: true, orderNumber: true, status: true, totalAmount: true },
    });

    if (activeSOs.length > 0) {
      const totalValue = activeSOs.reduce((sum, so) => sum + (so.totalAmount || 0), 0);
      impactedItems.push({
        id: customerId,
        entity: 'salesOrder',
        entityCode: customer.code,
        entityName: `${activeSOs.length} Active SO(s) - Total: ${totalValue.toLocaleString('vi-VN')} ₫`,
        relationship: 'Sales Orders - Customer Inactive',
        changes: [{
          field: 'customerStatus',
          fieldLabel: 'Customer Status',
          oldValue: 'Active',
          newValue: 'Inactive',
          valueType: 'string',
        }],
        navigationUrl: `/orders?customerId=${customerId}`,
        canNavigate: true,
      });
    }

    // Check for pending invoices
    const pendingInvoices = await prisma.salesInvoice.findMany({
      where: {
        customerId,
        status: { in: ['DRAFT', 'SENT'] },
      },
      select: { id: true, invoiceNumber: true, totalAmount: true },
    });

    if (pendingInvoices.length > 0) {
      const totalInvoiced = pendingInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      impactedItems.push({
        id: customerId,
        entity: 'customer',
        entityCode: customer.code,
        entityName: `${pendingInvoices.length} Pending Invoice(s) - Total: ${totalInvoiced.toLocaleString('vi-VN')} ₫`,
        relationship: 'Invoices - Payment Collection',
        changes: [{
          field: 'paymentRisk',
          fieldLabel: 'Payment Risk',
          oldValue: 'Normal',
          newValue: 'Review Required',
          valueType: 'string',
        }],
        navigationUrl: `/finance/invoices?customerId=${customerId}`,
        canNavigate: true,
      });
    }
  }

  // Check for credit limit changes
  const creditLimitChange = changes.find(c => c.field === 'creditLimit');
  if (creditLimitChange) {
    const oldLimit = Number(creditLimitChange.oldValue) || 0;
    const newLimit = Number(creditLimitChange.newValue) || 0;

    // If credit limit is reduced
    if (newLimit < oldLimit) {
      // Get current unpaid invoices
      const unpaidInvoices = await prisma.salesInvoice.findMany({
        where: {
          customerId,
          status: { in: ['SENT', 'OVERDUE'] },
        },
        select: { totalAmount: true },
      });

      const totalUnpaid = unpaidInvoices.reduce(
        (sum, inv) => sum + (inv.totalAmount || 0),
        0
      );

      if (totalUnpaid > newLimit) {
        impactedItems.push({
          id: customerId,
          entity: 'customer',
          entityCode: customer.code,
          entityName: `Unpaid Invoices: ${totalUnpaid.toLocaleString('vi-VN')} ₫`,
          relationship: 'Credit - Over Limit Alert',
          changes: [{
            field: 'creditStatus',
            fieldLabel: 'Credit Status',
            oldValue: 'Within Limit',
            newValue: `Exceeds New Limit by ${(totalUnpaid - newLimit).toLocaleString('vi-VN')} ₫`,
            valueType: 'string',
          }],
          navigationUrl: `/customers/${customerId}`,
          canNavigate: true,
        });
      }

      // Get pending orders that might be affected
      const pendingOrders = await prisma.salesOrder.findMany({
        where: {
          customerId,
          status: { in: ['draft', 'pending'] },
        },
        select: { id: true, orderNumber: true, totalAmount: true },
      });

      if (pendingOrders.length > 0) {
        const pendingTotal = pendingOrders.reduce((sum, so) => sum + (so.totalAmount || 0), 0);
        impactedItems.push({
          id: customerId,
          entity: 'salesOrder',
          entityCode: customer.code,
          entityName: `${pendingOrders.length} Pending Order(s) - Value: ${pendingTotal.toLocaleString('vi-VN')} ₫`,
          relationship: 'Orders - Credit Approval Required',
          changes: [{
            field: 'creditApproval',
            fieldLabel: 'Credit Approval',
            oldValue: 'Auto-approved',
            newValue: 'Manual Review Required',
            valueType: 'string',
          }],
          navigationUrl: `/orders?customerId=${customerId}&status=pending`,
          canNavigate: true,
        });
      }
    }
  }

  // Check for payment terms changes
  const paymentTermsChange = changes.find(c => c.field === 'paymentTerms');
  if (paymentTermsChange) {
    // Get open invoices that might need updated terms
    const openInvoices = await prisma.salesInvoice.findMany({
      where: {
        customerId,
        status: { in: ['DRAFT'] },
      },
      select: { id: true, invoiceNumber: true },
    });

    if (openInvoices.length > 0) {
      impactedItems.push({
        id: customerId,
        entity: 'customer',
        entityCode: customer.code,
        entityName: `${openInvoices.length} Draft Invoice(s)`,
        relationship: 'Invoices - Payment Terms Update',
        changes: [{
          field: 'paymentTerms',
          fieldLabel: 'Payment Terms',
          oldValue: paymentTermsChange.oldValue,
          newValue: paymentTermsChange.newValue,
          valueType: 'string',
        }],
        navigationUrl: `/finance/invoices?customerId=${customerId}&status=draft`,
        canNavigate: true,
      });
    }
  }

  // Check for tier changes
  const tierChange = changes.find(c => c.field === 'tier');
  if (tierChange) {
    impactedItems.push({
      id: customerId,
      entity: 'customer',
      entityCode: customer.code,
      entityName: `Customer Tier Change`,
      relationship: 'Pricing & Discounts',
      changes: [{
        field: 'pricing',
        fieldLabel: 'Pricing Tier',
        oldValue: tierChange.oldValue,
        newValue: tierChange.newValue,
        valueType: 'string',
      }],
      navigationUrl: `/customers/${customerId}`,
      canNavigate: true,
    });
  }

  return {
    sourceEntity: 'customer' as ImpactableEntity,
    sourceId: customerId,
    sourceCode: customer.code,
    changes,
    impactedItems,
    totalImpactedCount: impactedItems.length,
    calculatedAt: new Date(),
  };
}
