/**
 * CAPA Workflow Unit Tests
 * Tests for CAPA status transitions, permission validation, and workflow actions
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
  getAvailableCAPATransitions,
  transitionCAPA,
  generateCAPANumber,
  CAPA_TRANSITIONS,
  CAPA_STATUS_CONFIG,
  CAPAStatus,
} from '../capa-workflow';
import { prisma } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    cAPA: {
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    cAPAHistory: {
      create: vi.fn(),
    },
  },
}));

describe('CAPA Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAvailableCAPATransitions', () => {
    it('should return START_RCA transition for open status', () => {
      const transitions = getAvailableCAPATransitions('open', 'operator');
      expect(transitions).toHaveLength(1);
      expect(transitions[0].action).toBe('START_RCA');
    });

    it('should return COMPLETE_RCA transition for root_cause_analysis status', () => {
      const transitions = getAvailableCAPATransitions('root_cause_analysis', 'operator');
      expect(transitions).toHaveLength(1);
      expect(transitions[0].action).toBe('COMPLETE_RCA');
    });

    it('should return START_IMPLEMENTATION for action_planning status', () => {
      const transitions = getAvailableCAPATransitions('action_planning', 'operator');
      expect(transitions).toHaveLength(1);
      expect(transitions[0].action).toBe('START_IMPLEMENTATION');
    });

    it('should return COMPLETE_ACTIONS for implementation status', () => {
      const transitions = getAvailableCAPATransitions('implementation', 'operator');
      expect(transitions).toHaveLength(1);
      expect(transitions[0].action).toBe('COMPLETE_ACTIONS');
    });

    it('should return VERIFY_EFFECTIVENESS for verification status', () => {
      const transitions = getAvailableCAPATransitions('verification', 'operator');
      expect(transitions).toHaveLength(1);
      expect(transitions[0].action).toBe('VERIFY_EFFECTIVENESS');
    });

    it('should not allow operator to close CAPA', () => {
      const transitions = getAvailableCAPATransitions('completed', 'operator');
      expect(transitions).toHaveLength(0);
    });

    it('should allow quality_manager to close CAPA', () => {
      const transitions = getAvailableCAPATransitions('completed', 'quality_manager');
      expect(transitions).toHaveLength(1);
      expect(transitions[0].action).toBe('CLOSE_CAPA');
    });

    it('should allow admin to close CAPA', () => {
      const transitions = getAvailableCAPATransitions('completed', 'admin');
      expect(transitions).toHaveLength(1);
      expect(transitions[0].action).toBe('CLOSE_CAPA');
    });

    it('should return no transitions for closed status', () => {
      const transitions = getAvailableCAPATransitions('closed', 'admin');
      expect(transitions).toHaveLength(0);
    });
  });

  describe('transitionCAPA', () => {
    it('should successfully transition CAPA with valid action', async () => {
      const mockCAPA = {
        id: 'capa-1',
        status: 'open',
      };

      (prisma.cAPA.findUnique as Mock).mockResolvedValue(mockCAPA);
      (prisma.cAPA.update as Mock).mockResolvedValue({ ...mockCAPA, status: 'root_cause_analysis' });
      (prisma.cAPAHistory.create as Mock).mockResolvedValue({});

      const result = await transitionCAPA('capa-1', 'START_RCA', 'user-1');

      expect(result.success).toBe(true);
      expect(prisma.cAPA.update).toHaveBeenCalledWith({
        where: { id: 'capa-1' },
        data: expect.objectContaining({ status: 'root_cause_analysis' }),
      });
      expect(prisma.cAPAHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          capaId: 'capa-1',
          action: 'START_RCA',
          fromStatus: 'open',
          toStatus: 'root_cause_analysis',
          userId: 'user-1',
        }),
      });
    });

    it('should return error when CAPA not found', async () => {
      (prisma.cAPA.findUnique as Mock).mockResolvedValue(null);

      const result = await transitionCAPA('invalid-id', 'START_RCA', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('CAPA not found');
    });

    it('should return error for invalid transition', async () => {
      const mockCAPA = { id: 'capa-1', status: 'closed' };
      (prisma.cAPA.findUnique as Mock).mockResolvedValue(mockCAPA);

      const result = await transitionCAPA('capa-1', 'START_RCA', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid transition');
    });

    it('should validate required fields for COMPLETE_RCA', async () => {
      const mockCAPA = {
        id: 'capa-1',
        status: 'root_cause_analysis',
        rootCause: null,
        rcaMethod: null,
      };

      (prisma.cAPA.findUnique as Mock).mockResolvedValue(mockCAPA);

      const result = await transitionCAPA('capa-1', 'COMPLETE_RCA', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required field: rootCause');
    });

    it('should accept required fields from data parameter', async () => {
      const mockCAPA = {
        id: 'capa-1',
        status: 'root_cause_analysis',
        rootCause: null,
        rcaMethod: null,
      };

      (prisma.cAPA.findUnique as Mock).mockResolvedValue(mockCAPA);
      (prisma.cAPA.update as Mock).mockResolvedValue({ ...mockCAPA, status: 'action_planning' });
      (prisma.cAPAHistory.create as Mock).mockResolvedValue({});

      const result = await transitionCAPA('capa-1', 'COMPLETE_RCA', 'user-1', {
        rootCause: 'Supplier material defect',
        rcaMethod: '5 Whys',
      });

      expect(result.success).toBe(true);
    });

    it('should add rcaCompletedBy when completing RCA', async () => {
      const mockCAPA = {
        id: 'capa-1',
        status: 'root_cause_analysis',
        rootCause: 'Existing root cause',
        rcaMethod: '5 Whys',
      };

      (prisma.cAPA.findUnique as Mock).mockResolvedValue(mockCAPA);
      (prisma.cAPA.update as Mock).mockResolvedValue({});
      (prisma.cAPAHistory.create as Mock).mockResolvedValue({});

      await transitionCAPA('capa-1', 'COMPLETE_RCA', 'analyst-1');

      expect(prisma.cAPA.update).toHaveBeenCalledWith({
        where: { id: 'capa-1' },
        data: expect.objectContaining({
          status: 'action_planning',
          rcaCompletedBy: 'analyst-1',
          rcaCompletedAt: expect.any(Date),
        }),
      });
    });

    it('should add verifiedBy when verifying effectiveness', async () => {
      const mockCAPA = {
        id: 'capa-1',
        status: 'verification',
        verificationResults: 'All actions verified',
        effectivenessScore: 95,
      };

      (prisma.cAPA.findUnique as Mock).mockResolvedValue(mockCAPA);
      (prisma.cAPA.update as Mock).mockResolvedValue({});
      (prisma.cAPAHistory.create as Mock).mockResolvedValue({});

      await transitionCAPA('capa-1', 'VERIFY_EFFECTIVENESS', 'qa-manager-1');

      expect(prisma.cAPA.update).toHaveBeenCalledWith({
        where: { id: 'capa-1' },
        data: expect.objectContaining({
          status: 'completed',
          verifiedBy: 'qa-manager-1',
          verifiedAt: expect.any(Date),
        }),
      });
    });

    it('should add closedBy when closing CAPA', async () => {
      const mockCAPA = {
        id: 'capa-1',
        status: 'completed',
        closureNotes: 'All issues resolved',
      };

      (prisma.cAPA.findUnique as Mock).mockResolvedValue(mockCAPA);
      (prisma.cAPA.update as Mock).mockResolvedValue({});
      (prisma.cAPAHistory.create as Mock).mockResolvedValue({});

      await transitionCAPA('capa-1', 'CLOSE_CAPA', 'manager-1');

      expect(prisma.cAPA.update).toHaveBeenCalledWith({
        where: { id: 'capa-1' },
        data: expect.objectContaining({
          status: 'closed',
          closedBy: 'manager-1',
          closedAt: expect.any(Date),
        }),
      });
    });

    it('should require closureNotes when closing CAPA', async () => {
      const mockCAPA = {
        id: 'capa-1',
        status: 'completed',
        closureNotes: null,
      };

      (prisma.cAPA.findUnique as Mock).mockResolvedValue(mockCAPA);

      const result = await transitionCAPA('capa-1', 'CLOSE_CAPA', 'manager-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required field: closureNotes');
    });
  });

  describe('generateCAPANumber', () => {
    it('should generate CAPA number with current year and sequential number', async () => {
      const year = new Date().getFullYear();
      (prisma.cAPA.count as Mock).mockResolvedValue(10);

      const capaNumber = await generateCAPANumber();

      expect(capaNumber).toBe(`CAPA-${year}-0011`);
    });

    it('should generate first CAPA number when no CAPAs exist', async () => {
      const year = new Date().getFullYear();
      (prisma.cAPA.count as Mock).mockResolvedValue(0);

      const capaNumber = await generateCAPANumber();

      expect(capaNumber).toBe(`CAPA-${year}-0001`);
    });

    it('should pad number to 4 digits', async () => {
      const year = new Date().getFullYear();
      (prisma.cAPA.count as Mock).mockResolvedValue(9999);

      const capaNumber = await generateCAPANumber();

      expect(capaNumber).toBe(`CAPA-${year}-10000`);
    });
  });

  describe('CAPA_TRANSITIONS constant', () => {
    it('should have all required transition definitions', () => {
      expect(CAPA_TRANSITIONS.length).toBeGreaterThan(0);

      const actions = CAPA_TRANSITIONS.map(t => t.action);
      expect(actions).toContain('START_RCA');
      expect(actions).toContain('COMPLETE_RCA');
      expect(actions).toContain('START_IMPLEMENTATION');
      expect(actions).toContain('COMPLETE_ACTIONS');
      expect(actions).toContain('VERIFY_EFFECTIVENESS');
      expect(actions).toContain('CLOSE_CAPA');
    });

    it('should have required fields for COMPLETE_RCA', () => {
      const rcaTransition = CAPA_TRANSITIONS.find(t => t.action === 'COMPLETE_RCA');
      expect(rcaTransition?.requiredFields).toContain('rootCause');
      expect(rcaTransition?.requiredFields).toContain('rcaMethod');
    });

    it('should have required fields for VERIFY_EFFECTIVENESS', () => {
      const verifyTransition = CAPA_TRANSITIONS.find(t => t.action === 'VERIFY_EFFECTIVENESS');
      expect(verifyTransition?.requiredFields).toContain('verificationResults');
      expect(verifyTransition?.requiredFields).toContain('effectivenessScore');
    });
  });

  describe('CAPA_STATUS_CONFIG', () => {
    it('should have config for all statuses', () => {
      const statuses: CAPAStatus[] = [
        'open',
        'root_cause_analysis',
        'action_planning',
        'implementation',
        'verification',
        'completed',
        'closed',
      ];

      statuses.forEach(status => {
        expect(CAPA_STATUS_CONFIG[status]).toBeDefined();
        expect(CAPA_STATUS_CONFIG[status].label).toBeDefined();
        expect(CAPA_STATUS_CONFIG[status].color).toBeDefined();
      });
    });
  });
});
