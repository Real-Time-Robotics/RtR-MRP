/**
 * Workflow Engine Unit Tests
 * Tests for workflow lifecycle: start, approve, reject, escalate, delegate, cancel
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { WorkflowEngine } from '../workflow-engine';
import { prisma } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    workflowDefinition: {
      findFirst: vi.fn(),
    },
    workflowInstance: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    workflowApproval: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    workflowHistory: {
      create: vi.fn(),
    },
    workflowNotification: {
      create: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;

  beforeEach(() => {
    engine = new WorkflowEngine();
    vi.clearAllMocks();
  });

  describe('startWorkflow', () => {
    it('should start a workflow and create first approval', async () => {
      const mockWorkflow = {
        id: 'wf-1',
        name: 'PO Approval',
        code: 'PO_APPROVAL',
        isActive: true,
        defaultSlaHours: 48,
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            name: 'Manager Approval',
            approverRole: 'manager',
            slaHours: 24,
          },
        ],
      };

      const mockInstance = {
        id: 'instance-1',
        workflowId: 'wf-1',
        status: 'PENDING',
        currentStepNumber: 1,
      };

      const mockUser = { id: 'user-manager', role: 'manager' };

      (prisma.workflowDefinition.findFirst as Mock).mockResolvedValue(mockWorkflow);
      (prisma.workflowInstance.create as Mock).mockResolvedValue(mockInstance);
      (prisma.user.findFirst as Mock).mockResolvedValue(mockUser);
      (prisma.workflowApproval.create as Mock).mockResolvedValue({ id: 'approval-1' });
      (prisma.workflowHistory.create as Mock).mockResolvedValue({ id: 'history-1' });
      (prisma.workflowNotification.create as Mock).mockResolvedValue({ id: 'notif-1' });

      const result = await engine.startWorkflow({
        workflowCode: 'PO_APPROVAL',
        entityType: 'PURCHASE_ORDER',
        entityId: 'po-123',
        initiatedBy: 'user-requester',
        contextData: { amount: 50000 },
      });

      expect(result.success).toBe(true);
      expect(result.instanceId).toBe('instance-1');
      expect(result.status).toBe('PENDING');

      expect(prisma.workflowInstance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workflowId: 'wf-1',
          entityType: 'PURCHASE_ORDER',
          entityId: 'po-123',
          status: 'PENDING',
          currentStepNumber: 1,
          initiatedBy: 'user-requester',
        }),
      });

      expect(prisma.workflowApproval.create).toHaveBeenCalled();
      expect(prisma.workflowHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'STARTED',
          stepNumber: 1,
          performedBy: 'user-requester',
        }),
      });
    });

    it('should return error if workflow not found', async () => {
      (prisma.workflowDefinition.findFirst as Mock).mockResolvedValue(null);

      const result = await engine.startWorkflow({
        workflowCode: 'INVALID_CODE',
        entityType: 'PURCHASE_ORDER',
        entityId: 'po-123',
        initiatedBy: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return error if workflow has no steps', async () => {
      const mockWorkflow = {
        id: 'wf-1',
        name: 'Empty Workflow',
        isActive: true,
        steps: [],
      };

      (prisma.workflowDefinition.findFirst as Mock).mockResolvedValue(mockWorkflow);

      const result = await engine.startWorkflow({
        workflowCode: 'EMPTY_WF',
        entityType: 'PURCHASE_ORDER',
        entityId: 'po-123',
        initiatedBy: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('no steps');
    });
  });

  describe('approveStep', () => {
    it('should approve step and move to next step', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'wf-1',
        status: 'PENDING',
        currentStepNumber: 1,
        initiatedBy: 'user-requester',
        contextData: {},
        workflow: {
          id: 'wf-1',
          name: 'Test Workflow',
          steps: [
            { id: 'step-1', stepNumber: 1, nextStepOnApprove: 2 },
            { id: 'step-2', stepNumber: 2, approverRole: 'director' },
          ],
        },
        approvals: [
          {
            id: 'approval-1',
            approverId: 'user-approver',
            decision: 'PENDING',
          },
        ],
      };

      const mockApprover = { id: 'user-director', role: 'director' };

      (prisma.workflowInstance.findUnique as Mock).mockResolvedValue(mockInstance);
      (prisma.workflowApproval.update as Mock).mockResolvedValue({ id: 'approval-1' });
      (prisma.workflowHistory.create as Mock).mockResolvedValue({ id: 'history-1' });
      (prisma.workflowInstance.update as Mock).mockResolvedValue({ ...mockInstance, currentStepNumber: 2 });
      (prisma.user.findFirst as Mock).mockResolvedValue(mockApprover);
      (prisma.workflowApproval.create as Mock).mockResolvedValue({ id: 'approval-2' });
      (prisma.workflowNotification.create as Mock).mockResolvedValue({ id: 'notif-1' });

      const result = await engine.approveStep({
        instanceId: 'instance-1',
        approverId: 'user-approver',
        comments: 'Looks good',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('IN_PROGRESS');

      expect(prisma.workflowApproval.update).toHaveBeenCalledWith({
        where: { id: 'approval-1' },
        data: expect.objectContaining({
          decision: 'APPROVED',
          comments: 'Looks good',
          respondedAt: expect.any(Date),
        }),
      });

      expect(prisma.workflowInstance.update).toHaveBeenCalledWith({
        where: { id: 'instance-1' },
        data: expect.objectContaining({
          currentStepNumber: 2,
          status: 'IN_PROGRESS',
        }),
      });
    });

    it('should complete workflow on final step approval', async () => {
      const mockInstance = {
        id: 'instance-1',
        workflowId: 'wf-1',
        status: 'IN_PROGRESS',
        currentStepNumber: 2,
        initiatedBy: 'user-requester',
        workflow: {
          id: 'wf-1',
          name: 'Test Workflow',
          steps: [
            { id: 'step-1', stepNumber: 1 },
            { id: 'step-2', stepNumber: 2 }, // Final step
          ],
        },
        approvals: [
          {
            id: 'approval-1',
            approverId: 'user-approver',
            decision: 'PENDING',
          },
        ],
      };

      (prisma.workflowInstance.findUnique as Mock).mockResolvedValue(mockInstance);
      (prisma.workflowApproval.update as Mock).mockResolvedValue({ id: 'approval-1' });
      (prisma.workflowHistory.create as Mock).mockResolvedValue({ id: 'history-1' });
      (prisma.workflowInstance.update as Mock).mockResolvedValue({
        ...mockInstance,
        status: 'APPROVED',
        finalDecision: 'APPROVED',
      });
      (prisma.workflowNotification.create as Mock).mockResolvedValue({ id: 'notif-1' });

      const result = await engine.approveStep({
        instanceId: 'instance-1',
        approverId: 'user-approver',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('APPROVED');

      expect(prisma.workflowInstance.update).toHaveBeenCalledWith({
        where: { id: 'instance-1' },
        data: expect.objectContaining({
          status: 'APPROVED',
          finalDecision: 'APPROVED',
          completedAt: expect.any(Date),
        }),
      });
    });

    it('should return error if no pending approval found', async () => {
      const mockInstance = {
        id: 'instance-1',
        status: 'PENDING',
        currentStepNumber: 1,
        workflow: { steps: [{ stepNumber: 1 }] },
        approvals: [], // No approvals
      };

      (prisma.workflowInstance.findUnique as Mock).mockResolvedValue(mockInstance);

      const result = await engine.approveStep({
        instanceId: 'instance-1',
        approverId: 'user-wrong',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No pending approval');
    });

    it('should return error for invalid workflow status', async () => {
      const mockInstance = {
        id: 'instance-1',
        status: 'APPROVED', // Already completed
        workflow: { steps: [] },
        approvals: [],
      };

      (prisma.workflowInstance.findUnique as Mock).mockResolvedValue(mockInstance);

      const result = await engine.approveStep({
        instanceId: 'instance-1',
        approverId: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot approve');
    });
  });

  describe('rejectStep', () => {
    it('should reject workflow and notify initiator', async () => {
      const mockInstance = {
        id: 'instance-1',
        status: 'PENDING',
        currentStepNumber: 1,
        initiatedBy: 'user-requester',
        workflow: {
          id: 'wf-1',
          name: 'Test Workflow',
        },
        approvals: [
          {
            id: 'approval-1',
            approverId: 'user-approver',
            decision: 'PENDING',
          },
        ],
      };

      (prisma.workflowInstance.findUnique as Mock).mockResolvedValue(mockInstance);
      (prisma.workflowApproval.update as Mock).mockResolvedValue({ id: 'approval-1' });
      (prisma.workflowInstance.update as Mock).mockResolvedValue({
        ...mockInstance,
        status: 'REJECTED',
      });
      (prisma.workflowHistory.create as Mock).mockResolvedValue({ id: 'history-1' });
      (prisma.workflowNotification.create as Mock).mockResolvedValue({ id: 'notif-1' });

      const result = await engine.rejectStep({
        instanceId: 'instance-1',
        approverId: 'user-approver',
        comments: 'Budget exceeded',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('REJECTED');

      expect(prisma.workflowApproval.update).toHaveBeenCalledWith({
        where: { id: 'approval-1' },
        data: expect.objectContaining({
          decision: 'REJECTED',
          comments: 'Budget exceeded',
        }),
      });

      expect(prisma.workflowInstance.update).toHaveBeenCalledWith({
        where: { id: 'instance-1' },
        data: expect.objectContaining({
          status: 'REJECTED',
          finalDecision: 'REJECTED',
          finalComments: 'Budget exceeded',
        }),
      });

      // Should notify initiator
      expect(prisma.workflowNotification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          recipientId: 'user-requester',
          type: 'REJECTED',
        }),
      });
    });
  });

  describe('escalateStep', () => {
    it('should escalate overdue approval', async () => {
      const mockInstance = {
        id: 'instance-1',
        status: 'PENDING',
        currentStepNumber: 1,
        workflow: {
          id: 'wf-1',
          name: 'Test Workflow',
          steps: [{ stepNumber: 1, escalateTo: 'user-escalation' }],
        },
        approvals: [
          {
            id: 'approval-1',
            approverId: 'user-original',
            decision: 'PENDING',
            step: { escalateTo: 'user-escalation', slaHours: 24 },
          },
        ],
      };

      (prisma.workflowInstance.findUnique as Mock).mockResolvedValue(mockInstance);
      (prisma.workflowApproval.update as Mock).mockResolvedValue({ id: 'approval-1' });
      (prisma.workflowApproval.create as Mock).mockResolvedValue({ id: 'approval-2' });
      (prisma.workflowInstance.update as Mock).mockResolvedValue({
        ...mockInstance,
        status: 'ESCALATED',
      });
      (prisma.workflowHistory.create as Mock).mockResolvedValue({ id: 'history-1' });
      (prisma.workflowNotification.create as Mock).mockResolvedValue({ id: 'notif-1' });

      const result = await engine.escalateStep('instance-1', 'Overdue', 'system');

      expect(result.success).toBe(true);
      expect(result.status).toBe('ESCALATED');

      expect(prisma.workflowApproval.update).toHaveBeenCalledWith({
        where: { id: 'approval-1' },
        data: expect.objectContaining({
          decision: 'ESCALATED',
        }),
      });

      expect(prisma.workflowApproval.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          approverId: 'user-escalation',
          decision: 'PENDING',
        }),
      });
    });

    it('should return error if no escalation target defined', async () => {
      const mockInstance = {
        id: 'instance-1',
        status: 'PENDING',
        currentStepNumber: 1,
        workflow: { steps: [] },
        approvals: [
          {
            id: 'approval-1',
            step: { escalateTo: null }, // No escalation target
          },
        ],
      };

      (prisma.workflowInstance.findUnique as Mock).mockResolvedValue(mockInstance);

      const result = await engine.escalateStep('instance-1', 'Overdue', 'system');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No escalation target');
    });
  });

  describe('cancelWorkflow', () => {
    it('should cancel workflow', async () => {
      const mockInstance = {
        id: 'instance-1',
        status: 'PENDING',
        currentStepNumber: 1,
      };

      (prisma.workflowInstance.findUnique as Mock).mockResolvedValue(mockInstance);
      (prisma.workflowInstance.update as Mock).mockResolvedValue({
        ...mockInstance,
        status: 'CANCELLED',
      });
      (prisma.workflowHistory.create as Mock).mockResolvedValue({ id: 'history-1' });

      const result = await engine.cancelWorkflow('instance-1', 'user-1', 'No longer needed');

      expect(result.success).toBe(true);
      expect(result.status).toBe('CANCELLED');

      expect(prisma.workflowInstance.update).toHaveBeenCalledWith({
        where: { id: 'instance-1' },
        data: expect.objectContaining({
          status: 'CANCELLED',
          finalComments: 'No longer needed',
        }),
      });
    });

    it('should not cancel already completed workflow', async () => {
      const mockInstance = {
        id: 'instance-1',
        status: 'APPROVED',
      };

      (prisma.workflowInstance.findUnique as Mock).mockResolvedValue(mockInstance);

      const result = await engine.cancelWorkflow('instance-1', 'user-1', 'Reason');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot cancel');
    });
  });

  describe('delegateApproval', () => {
    it('should delegate approval to another user', async () => {
      const mockApproval = {
        id: 'approval-1',
        instanceId: 'instance-1',
        approverId: 'user-original',
        stepId: 'step-1',
        decision: 'PENDING',
        dueDate: new Date(),
        instance: { currentStepNumber: 1 },
        step: { name: 'Test Step' },
      };

      (prisma.workflowApproval.findUnique as Mock).mockResolvedValue(mockApproval);
      (prisma.workflowApproval.update as Mock).mockResolvedValue({
        ...mockApproval,
        decision: 'DELEGATED',
      });
      (prisma.workflowApproval.create as Mock).mockResolvedValue({ id: 'approval-2' });
      (prisma.workflowHistory.create as Mock).mockResolvedValue({ id: 'history-1' });
      (prisma.workflowNotification.create as Mock).mockResolvedValue({ id: 'notif-1' });

      const result = await engine.delegateApproval({
        approvalId: 'approval-1',
        delegatedBy: 'user-original',
        delegateTo: 'user-delegate',
        reason: 'On vacation',
      });

      expect(result.success).toBe(true);

      expect(prisma.workflowApproval.update).toHaveBeenCalledWith({
        where: { id: 'approval-1' },
        data: expect.objectContaining({
          decision: 'DELEGATED',
          delegatedTo: 'user-delegate',
          delegationReason: 'On vacation',
        }),
      });

      expect(prisma.workflowApproval.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          approverId: 'user-delegate',
          decision: 'PENDING',
        }),
      });
    });

    it('should return error if not the assigned approver', async () => {
      const mockApproval = {
        id: 'approval-1',
        approverId: 'user-original',
        decision: 'PENDING',
      };

      (prisma.workflowApproval.findUnique as Mock).mockResolvedValue(mockApproval);

      const result = await engine.delegateApproval({
        approvalId: 'approval-1',
        delegatedBy: 'user-wrong', // Not the assigned approver
        delegateTo: 'user-delegate',
        reason: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Only the assigned approver');
    });

    it('should not delegate already decided approvals', async () => {
      const mockApproval = {
        id: 'approval-1',
        approverId: 'user-original',
        decision: 'APPROVED', // Already decided
      };

      (prisma.workflowApproval.findUnique as Mock).mockResolvedValue(mockApproval);

      const result = await engine.delegateApproval({
        approvalId: 'approval-1',
        delegatedBy: 'user-original',
        delegateTo: 'user-delegate',
        reason: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('pending approvals');
    });
  });

  describe('getPendingApprovals', () => {
    it('should return pending approvals for user', async () => {
      const mockApprovals = [
        {
          id: 'approval-1',
          approverId: 'user-1',
          decision: 'PENDING',
          instance: { workflow: { name: 'PO Approval' } },
          step: { name: 'Step 1' },
        },
        {
          id: 'approval-2',
          approverId: 'user-1',
          decision: 'PENDING',
          instance: { workflow: { name: 'NCR Review' } },
          step: { name: 'Step 2' },
        },
      ];

      (prisma.workflowApproval.findMany as Mock).mockResolvedValue(mockApprovals);

      const result = await engine.getPendingApprovals('user-1');

      expect(result).toHaveLength(2);
      expect(prisma.workflowApproval.findMany).toHaveBeenCalledWith({
        where: {
          approverId: 'user-1',
          decision: 'PENDING',
        },
        include: expect.any(Object),
        orderBy: { requestedAt: 'asc' },
      });
    });
  });

  describe('getWorkflowInstance', () => {
    it('should return full workflow instance details', async () => {
      const mockInstance = {
        id: 'instance-1',
        status: 'IN_PROGRESS',
        workflow: {
          name: 'PO Approval',
          steps: [{ stepNumber: 1 }, { stepNumber: 2 }],
        },
        approvals: [{ id: 'approval-1' }],
        history: [{ action: 'STARTED' }],
        initiatedByUser: { name: 'John Doe' },
      };

      (prisma.workflowInstance.findUnique as Mock).mockResolvedValue(mockInstance);

      const result = await engine.getWorkflowInstance('instance-1');

      expect(result).toEqual(mockInstance);
      expect(prisma.workflowInstance.findUnique).toHaveBeenCalledWith({
        where: { id: 'instance-1' },
        include: expect.objectContaining({
          workflow: expect.any(Object),
          approvals: expect.any(Object),
          history: expect.any(Object),
        }),
      });
    });
  });
});
