/**
 * Workflow Triggers Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock workflow engine
const mockStartWorkflow = vi.fn();
vi.mock('../workflow-engine', () => ({
  workflowEngine: {
    startWorkflow: (...args: unknown[]) => mockStartWorkflow(...args),
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  },
}));

import {
  triggerPurchaseOrderWorkflow,
  triggerNCRWorkflow,
  triggerCAPAWorkflow,
  triggerWorkOrderWorkflow,
  triggerSalesOrderWorkflow,
  triggerInventoryAdjustmentWorkflow,
  triggerEngineeringChangeWorkflow,
  triggerWorkflow,
} from '../workflow-triggers';
import { logger } from '@/lib/logger';

describe('Workflow Triggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // triggerPurchaseOrderWorkflow
  // =========================================================================
  describe('triggerPurchaseOrderWorkflow', () => {
    it('should return triggered:true when workflow starts successfully', async () => {
      mockStartWorkflow.mockResolvedValue({ success: true, instanceId: 'inst-1' });

      const result = await triggerPurchaseOrderWorkflow('po-1', 'user-1', {
        totalAmount: 50000,
        supplierId: 'sup-1',
        supplierName: 'Supplier A',
      });

      expect(result).toEqual({ triggered: true, instanceId: 'inst-1' });
      expect(mockStartWorkflow).toHaveBeenCalledWith({
        workflowCode: 'PO_APPROVAL',
        entityType: 'PURCHASE_ORDER',
        entityId: 'po-1',
        initiatedBy: 'user-1',
        contextData: expect.objectContaining({
          amount: 50000,
          totalAmount: 50000,
          supplierId: 'sup-1',
        }),
      });
    });

    it('should return triggered:false when workflow engine returns failure', async () => {
      mockStartWorkflow.mockResolvedValue({ success: false, error: 'No definition' });

      const result = await triggerPurchaseOrderWorkflow('po-1', 'user-1', {
        totalAmount: 1000,
        supplierId: 'sup-1',
      });

      expect(result).toEqual({ triggered: false, error: 'No definition' });
    });

    it('should catch errors and return triggered:false', async () => {
      mockStartWorkflow.mockRejectedValue(new Error('DB down'));

      const result = await triggerPurchaseOrderWorkflow('po-1', 'user-1', {
        totalAmount: 1000,
        supplierId: 'sup-1',
      });

      expect(result).toEqual({ triggered: false, error: 'Failed to trigger workflow' });
      expect(logger.logError).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // triggerNCRWorkflow
  // =========================================================================
  describe('triggerNCRWorkflow', () => {
    it('should trigger NCR_REVIEW workflow on success', async () => {
      mockStartWorkflow.mockResolvedValue({ success: true, instanceId: 'inst-2' });

      const result = await triggerNCRWorkflow('ncr-1', 'user-1', {
        severity: 'CRITICAL',
        partId: 'p-1',
      });

      expect(result).toEqual({ triggered: true, instanceId: 'inst-2' });
      expect(mockStartWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowCode: 'NCR_REVIEW',
          entityType: 'NCR',
          entityId: 'ncr-1',
        })
      );
    });

    it('should return failure when engine fails', async () => {
      mockStartWorkflow.mockResolvedValue({ success: false, error: 'Not found' });

      const result = await triggerNCRWorkflow('ncr-1', 'user-1', { severity: 'MINOR' });

      expect(result).toEqual({ triggered: false, error: 'Not found' });
    });

    it('should catch exceptions', async () => {
      mockStartWorkflow.mockRejectedValue('string error');

      const result = await triggerNCRWorkflow('ncr-1', 'user-1', { severity: 'MAJOR' });

      expect(result).toEqual({ triggered: false, error: 'Failed to trigger workflow' });
      expect(logger.logError).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // triggerCAPAWorkflow
  // =========================================================================
  describe('triggerCAPAWorkflow', () => {
    it('should trigger CAPA_APPROVAL workflow on success', async () => {
      mockStartWorkflow.mockResolvedValue({ success: true, instanceId: 'inst-3' });

      const result = await triggerCAPAWorkflow('capa-1', 'user-1', {
        type: 'corrective',
        priority: 'HIGH',
      });

      expect(result).toEqual({ triggered: true, instanceId: 'inst-3' });
      expect(mockStartWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowCode: 'CAPA_APPROVAL',
          entityType: 'CAPA',
        })
      );
    });

    it('should handle failure result', async () => {
      mockStartWorkflow.mockResolvedValue({ success: false, error: 'err' });

      const result = await triggerCAPAWorkflow('capa-1', 'user-1', {
        type: 'preventive',
        priority: 'LOW',
      });

      expect(result.triggered).toBe(false);
    });
  });

  // =========================================================================
  // triggerWorkOrderWorkflow
  // =========================================================================
  describe('triggerWorkOrderWorkflow', () => {
    it('should trigger WO_RELEASE workflow on success', async () => {
      mockStartWorkflow.mockResolvedValue({ success: true, instanceId: 'inst-4' });

      const result = await triggerWorkOrderWorkflow('wo-1', 'user-1', {
        productId: 'prod-1',
        quantity: 100,
      });

      expect(result).toEqual({ triggered: true, instanceId: 'inst-4' });
      expect(mockStartWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowCode: 'WO_RELEASE',
          entityType: 'WORK_ORDER',
        })
      );
    });

    it('should catch thrown errors', async () => {
      mockStartWorkflow.mockRejectedValue(new Error('timeout'));

      const result = await triggerWorkOrderWorkflow('wo-1', 'user-1', {
        productId: 'prod-1',
        quantity: 10,
      });

      expect(result.triggered).toBe(false);
      expect(result.error).toBe('Failed to trigger workflow');
    });
  });

  // =========================================================================
  // triggerSalesOrderWorkflow
  // =========================================================================
  describe('triggerSalesOrderWorkflow', () => {
    it('should skip workflow when discount is undefined', async () => {
      const result = await triggerSalesOrderWorkflow('so-1', 'user-1', {
        totalAmount: 100000,
        customerId: 'cust-1',
      });

      expect(result.triggered).toBe(false);
      expect(result.error).toContain('discount <= 10%');
      expect(mockStartWorkflow).not.toHaveBeenCalled();
    });

    it('should skip workflow when discount <= 10', async () => {
      const result = await triggerSalesOrderWorkflow('so-1', 'user-1', {
        totalAmount: 100000,
        customerId: 'cust-1',
        discount: 10,
      });

      expect(result.triggered).toBe(false);
      expect(mockStartWorkflow).not.toHaveBeenCalled();
    });

    it('should trigger SO_APPROVAL when discount > 10', async () => {
      mockStartWorkflow.mockResolvedValue({ success: true, instanceId: 'inst-5' });

      const result = await triggerSalesOrderWorkflow('so-1', 'user-1', {
        totalAmount: 200000,
        customerId: 'cust-1',
        discount: 15,
      });

      expect(result).toEqual({ triggered: true, instanceId: 'inst-5' });
      expect(mockStartWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowCode: 'SO_APPROVAL',
          entityType: 'SALES_ORDER',
          contextData: expect.objectContaining({
            amount: 200000,
            discount_pct: 15,
          }),
        })
      );
    });

    it('should handle engine failure with discount > 10', async () => {
      mockStartWorkflow.mockResolvedValue({ success: false, error: 'fail' });

      const result = await triggerSalesOrderWorkflow('so-1', 'user-1', {
        totalAmount: 200000,
        customerId: 'cust-1',
        discount: 20,
      });

      expect(result).toEqual({ triggered: false, error: 'fail' });
    });

    it('should catch exceptions with discount > 10', async () => {
      mockStartWorkflow.mockRejectedValue(new Error('boom'));

      const result = await triggerSalesOrderWorkflow('so-1', 'user-1', {
        totalAmount: 200000,
        customerId: 'cust-1',
        discount: 25,
      });

      expect(result.triggered).toBe(false);
      expect(logger.logError).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // triggerInventoryAdjustmentWorkflow
  // =========================================================================
  describe('triggerInventoryAdjustmentWorkflow', () => {
    it('should skip workflow when value < 1000', async () => {
      const result = await triggerInventoryAdjustmentWorkflow('adj-1', 'user-1', {
        partId: 'p-1',
        adjustmentType: 'increase',
        quantity: 5,
        value: 999,
      });

      expect(result.triggered).toBe(false);
      expect(result.error).toContain('value < 1000');
      expect(mockStartWorkflow).not.toHaveBeenCalled();
    });

    it('should trigger INV_ADJUSTMENT when value >= 1000', async () => {
      mockStartWorkflow.mockResolvedValue({ success: true, instanceId: 'inst-6' });

      const result = await triggerInventoryAdjustmentWorkflow('adj-1', 'user-1', {
        partId: 'p-1',
        adjustmentType: 'decrease',
        quantity: 10,
        value: 5000,
      });

      expect(result).toEqual({ triggered: true, instanceId: 'inst-6' });
      expect(mockStartWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowCode: 'INV_ADJUSTMENT',
          entityType: 'INVENTORY_ADJUSTMENT',
        })
      );
    });

    it('should handle engine failure', async () => {
      mockStartWorkflow.mockResolvedValue({ success: false, error: 'no def' });

      const result = await triggerInventoryAdjustmentWorkflow('adj-1', 'user-1', {
        partId: 'p-1',
        adjustmentType: 'correction',
        quantity: 1,
        value: 2000,
      });

      expect(result).toEqual({ triggered: false, error: 'no def' });
    });
  });

  // =========================================================================
  // triggerEngineeringChangeWorkflow
  // =========================================================================
  describe('triggerEngineeringChangeWorkflow', () => {
    it('should trigger ECO_APPROVAL workflow on success', async () => {
      mockStartWorkflow.mockResolvedValue({ success: true, instanceId: 'inst-7' });

      const result = await triggerEngineeringChangeWorkflow('eco-1', 'user-1', {
        changeType: 'design',
        reason: 'Customer request',
      });

      expect(result).toEqual({ triggered: true, instanceId: 'inst-7' });
      expect(mockStartWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowCode: 'ECO_APPROVAL',
          entityType: 'ENGINEERING_CHANGE',
        })
      );
    });

    it('should catch exceptions', async () => {
      mockStartWorkflow.mockRejectedValue(new Error('fail'));

      const result = await triggerEngineeringChangeWorkflow('eco-1', 'user-1', {
        changeType: 'process',
        reason: 'Optimization',
      });

      expect(result.triggered).toBe(false);
    });
  });

  // =========================================================================
  // triggerWorkflow (generic)
  // =========================================================================
  describe('triggerWorkflow', () => {
    it('should trigger a generic workflow on success', async () => {
      mockStartWorkflow.mockResolvedValue({ success: true, instanceId: 'inst-8' });

      const result = await triggerWorkflow(
        'CUSTOM_WF',
        'PURCHASE_ORDER' as never,
        'entity-1',
        'user-1',
        { key: 'value' }
      );

      expect(result).toEqual({ triggered: true, instanceId: 'inst-8' });
      expect(mockStartWorkflow).toHaveBeenCalledWith({
        workflowCode: 'CUSTOM_WF',
        entityType: 'PURCHASE_ORDER',
        entityId: 'entity-1',
        initiatedBy: 'user-1',
        contextData: { key: 'value' },
      });
    });

    it('should work without contextData', async () => {
      mockStartWorkflow.mockResolvedValue({ success: true, instanceId: 'inst-9' });

      const result = await triggerWorkflow(
        'CUSTOM_WF',
        'NCR' as never,
        'entity-2',
        'user-2'
      );

      expect(result.triggered).toBe(true);
      expect(mockStartWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ contextData: undefined })
      );
    });

    it('should return failure on engine error', async () => {
      mockStartWorkflow.mockResolvedValue({ success: false, error: 'bad' });

      const result = await triggerWorkflow('WF', 'NCR' as never, 'e', 'u');

      expect(result).toEqual({ triggered: false, error: 'bad' });
    });

    it('should catch exceptions', async () => {
      mockStartWorkflow.mockRejectedValue(new Error('crash'));

      const result = await triggerWorkflow('WF', 'NCR' as never, 'e', 'u');

      expect(result).toEqual({ triggered: false, error: 'Failed to trigger workflow' });
      expect(logger.logError).toHaveBeenCalled();
    });
  });
});
