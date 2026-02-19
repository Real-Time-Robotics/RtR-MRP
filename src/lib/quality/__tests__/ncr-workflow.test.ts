/**
 * NCR Workflow Unit Tests
 * Tests for NCR status transitions, permission validation, and workflow actions
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
  canTransition,
  getAvailableTransitions,
  transitionNCR,
  generateNCRNumber,
  NCR_TRANSITIONS,
  NCR_STATUS_CONFIG,
  NCRStatus,
} from '../ncr-workflow';
import { prisma } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    nCR: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    nCRHistory: {
      create: vi.fn(),
    },
  },
}));

describe('NCR Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('canTransition', () => {
    it('should allow transition from open to under_review for any role', () => {
      expect(canTransition('open', 'under_review', 'operator')).toBe(true);
      expect(canTransition('open', 'under_review', 'quality_inspector')).toBe(true);
    });

    it('should allow transition from open to pending_disposition', () => {
      expect(canTransition('open', 'pending_disposition', 'operator')).toBe(true);
    });

    it('should allow transition from under_review to pending_disposition', () => {
      expect(canTransition('under_review', 'pending_disposition', 'quality_inspector')).toBe(true);
    });

    it('should require quality_manager or admin to approve disposition', () => {
      expect(canTransition('pending_disposition', 'disposition_approved', 'operator')).toBe(false);
      expect(canTransition('pending_disposition', 'disposition_approved', 'quality_manager')).toBe(true);
      expect(canTransition('pending_disposition', 'disposition_approved', 'admin')).toBe(true);
    });

    it('should allow transition from disposition_approved to in_rework', () => {
      expect(canTransition('disposition_approved', 'in_rework', 'operator')).toBe(true);
    });

    it('should allow transition from disposition_approved to completed', () => {
      expect(canTransition('disposition_approved', 'completed', 'operator')).toBe(true);
    });

    it('should allow transition from in_rework to pending_verification', () => {
      expect(canTransition('in_rework', 'pending_verification', 'operator')).toBe(true);
    });

    it('should require quality_inspector or quality_manager to verify rework', () => {
      expect(canTransition('pending_verification', 'completed', 'operator')).toBe(false);
      expect(canTransition('pending_verification', 'completed', 'quality_inspector')).toBe(true);
      expect(canTransition('pending_verification', 'completed', 'quality_manager')).toBe(true);
    });

    it('should allow closing completed NCRs', () => {
      expect(canTransition('completed', 'closed', 'operator')).toBe(true);
    });

    it('should require quality_manager or admin to void an NCR', () => {
      expect(canTransition('open', 'voided', 'operator')).toBe(false);
      expect(canTransition('open', 'voided', 'quality_manager')).toBe(true);
      expect(canTransition('under_review', 'voided', 'admin')).toBe(true);
      expect(canTransition('pending_disposition', 'voided', 'quality_manager')).toBe(true);
    });

    it('should not allow invalid transitions', () => {
      expect(canTransition('closed', 'open', 'admin')).toBe(false);
      expect(canTransition('voided', 'open', 'admin')).toBe(false);
      expect(canTransition('open', 'completed', 'admin')).toBe(false);
    });
  });

  describe('getAvailableTransitions', () => {
    it('should return all available transitions for open status', () => {
      const transitions = getAvailableTransitions('open', 'operator');
      expect(transitions.map(t => t.to)).toContain('under_review');
      expect(transitions.map(t => t.to)).toContain('pending_disposition');
    });

    it('should include void option for quality_manager on open status', () => {
      const transitions = getAvailableTransitions('open', 'quality_manager');
      expect(transitions.map(t => t.to)).toContain('voided');
    });

    it('should not include void option for operator on open status', () => {
      const transitions = getAvailableTransitions('open', 'operator');
      expect(transitions.map(t => t.to)).not.toContain('voided');
    });

    it('should return no transitions for closed status', () => {
      const transitions = getAvailableTransitions('closed', 'admin');
      expect(transitions).toHaveLength(0);
    });

    it('should return no transitions for voided status', () => {
      const transitions = getAvailableTransitions('voided', 'admin');
      expect(transitions).toHaveLength(0);
    });

    it('should filter by role permissions', () => {
      const operatorTransitions = getAvailableTransitions('pending_disposition', 'operator');
      const managerTransitions = getAvailableTransitions('pending_disposition', 'quality_manager');

      expect(operatorTransitions.map(t => t.to)).not.toContain('disposition_approved');
      expect(managerTransitions.map(t => t.to)).toContain('disposition_approved');
    });
  });

  describe('transitionNCR', () => {
    it('should successfully transition NCR with valid action', async () => {
      const mockNCR = {
        id: 'ncr-1',
        status: 'open',
        description: 'Test NCR',
        quantityAffected: 10,
      };

      (prisma.nCR.findUnique as Mock).mockResolvedValue(mockNCR);
      (prisma.nCR.update as Mock).mockResolvedValue({ ...mockNCR, status: 'under_review' });
      (prisma.nCRHistory.create as Mock).mockResolvedValue({});

      const result = await transitionNCR('ncr-1', 'START_REVIEW', 'user-1');

      expect(result.success).toBe(true);
      expect(prisma.nCR.update).toHaveBeenCalledWith({
        where: { id: 'ncr-1' },
        data: expect.objectContaining({ status: 'under_review' }),
      });
      expect(prisma.nCRHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ncrId: 'ncr-1',
          action: 'START_REVIEW',
          fromStatus: 'open',
          toStatus: 'under_review',
          userId: 'user-1',
        }),
      });
    });

    it('should return error when NCR not found', async () => {
      (prisma.nCR.findUnique as Mock).mockResolvedValue(null);

      const result = await transitionNCR('invalid-id', 'START_REVIEW', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('NCR not found');
    });

    it('should return error for invalid transition', async () => {
      const mockNCR = { id: 'ncr-1', status: 'closed' };
      (prisma.nCR.findUnique as Mock).mockResolvedValue(mockNCR);

      const result = await transitionNCR('ncr-1', 'START_REVIEW', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid transition');
    });

    it('should validate required fields and fail if missing', async () => {
      const mockNCR = {
        id: 'ncr-1',
        status: 'open',
        containmentAction: null,
        preliminaryCause: null,
      };

      (prisma.nCR.findUnique as Mock).mockResolvedValue(mockNCR);

      const result = await transitionNCR('ncr-1', 'SUBMIT_FOR_DISPOSITION', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required field: containmentAction');
    });

    it('should accept required fields from data parameter', async () => {
      const mockNCR = {
        id: 'ncr-1',
        status: 'open',
        containmentAction: null,
        preliminaryCause: null,
      };

      (prisma.nCR.findUnique as Mock).mockResolvedValue(mockNCR);
      (prisma.nCR.update as Mock).mockResolvedValue({ ...mockNCR, status: 'pending_disposition' });
      (prisma.nCRHistory.create as Mock).mockResolvedValue({});

      const result = await transitionNCR('ncr-1', 'SUBMIT_FOR_DISPOSITION', 'user-1', {
        containmentAction: 'Quarantine parts',
        preliminaryCause: 'Supplier defect',
      });

      expect(result.success).toBe(true);
    });

    it('should add dispositionApprovedBy when approving disposition', async () => {
      const mockNCR = {
        id: 'ncr-1',
        status: 'pending_disposition',
        disposition: 'REWORK',
        dispositionReason: 'Can be reworked',
      };

      (prisma.nCR.findUnique as Mock).mockResolvedValue(mockNCR);
      (prisma.nCR.update as Mock).mockResolvedValue({});
      (prisma.nCRHistory.create as Mock).mockResolvedValue({});

      await transitionNCR('ncr-1', 'APPROVE_DISPOSITION', 'manager-1');

      expect(prisma.nCR.update).toHaveBeenCalledWith({
        where: { id: 'ncr-1' },
        data: expect.objectContaining({
          status: 'disposition_approved',
          dispositionApprovedBy: 'manager-1',
          dispositionApprovedAt: expect.any(Date),
        }),
      });
    });

    it('should add closedBy when closing NCR', async () => {
      const mockNCR = {
        id: 'ncr-1',
        status: 'completed',
        closureNotes: 'All actions completed',
      };

      (prisma.nCR.findUnique as Mock).mockResolvedValue(mockNCR);
      (prisma.nCR.update as Mock).mockResolvedValue({});
      (prisma.nCRHistory.create as Mock).mockResolvedValue({});

      await transitionNCR('ncr-1', 'CLOSE_NCR', 'user-1');

      expect(prisma.nCR.update).toHaveBeenCalledWith({
        where: { id: 'ncr-1' },
        data: expect.objectContaining({
          status: 'closed',
          closedBy: 'user-1',
          closedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('generateNCRNumber', () => {
    it('should generate NCR number with current year and sequential number', async () => {
      const year = new Date().getFullYear();
      (prisma.nCR.findFirst as Mock).mockResolvedValue({ ncrNumber: `NCR-${year}-0005` });

      const ncrNumber = await generateNCRNumber();

      expect(ncrNumber).toBe(`NCR-${year}-0006`);
    });

    it('should generate first NCR number when no NCRs exist', async () => {
      const year = new Date().getFullYear();
      (prisma.nCR.findFirst as Mock).mockResolvedValue(null);

      const ncrNumber = await generateNCRNumber();

      expect(ncrNumber).toBe(`NCR-${year}-0001`);
    });

    it('should pad number to 4 digits', async () => {
      const year = new Date().getFullYear();
      (prisma.nCR.findFirst as Mock).mockResolvedValue({ ncrNumber: `NCR-${year}-0999` });

      const ncrNumber = await generateNCRNumber();

      expect(ncrNumber).toBe(`NCR-${year}-1000`);
    });
  });

  describe('NCR_TRANSITIONS constant', () => {
    it('should have all required transition definitions', () => {
      expect(NCR_TRANSITIONS.length).toBeGreaterThan(0);

      const actions = NCR_TRANSITIONS.map(t => t.action);
      expect(actions).toContain('START_REVIEW');
      expect(actions).toContain('SUBMIT_FOR_DISPOSITION');
      expect(actions).toContain('APPROVE_DISPOSITION');
      expect(actions).toContain('START_REWORK');
      expect(actions).toContain('COMPLETE_REWORK');
      expect(actions).toContain('VERIFY_REWORK');
      expect(actions).toContain('CLOSE_NCR');
      expect(actions).toContain('VOID_NCR');
    });

    it('should have required fields for disposition approval', () => {
      const approveTransition = NCR_TRANSITIONS.find(t => t.action === 'APPROVE_DISPOSITION');
      expect(approveTransition?.requiredFields).toContain('disposition');
      expect(approveTransition?.requiredFields).toContain('dispositionReason');
    });
  });

  describe('NCR_STATUS_CONFIG', () => {
    it('should have config for all statuses', () => {
      const statuses: NCRStatus[] = [
        'open',
        'under_review',
        'pending_disposition',
        'disposition_approved',
        'in_rework',
        'pending_verification',
        'completed',
        'closed',
        'voided',
      ];

      statuses.forEach(status => {
        expect(NCR_STATUS_CONFIG[status]).toBeDefined();
        expect(NCR_STATUS_CONFIG[status].label).toBeDefined();
        expect(NCR_STATUS_CONFIG[status].color).toBeDefined();
      });
    });
  });
});
