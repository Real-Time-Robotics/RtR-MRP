/**
 * Workflow API Routes Tests
 * Tests for POST /api/workflows (start workflow) and POST /api/workflows/approvals (approve/reject)
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    workflowDefinition: {
      findMany: vi.fn(),
    },
    workflowInstance: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    logError: vi.fn(),
  },
}));

vi.mock('@/lib/workflow', () => ({
  workflowEngine: {
    startWorkflow: vi.fn(),
    approveStep: vi.fn(),
    rejectStep: vi.fn(),
    getPendingApprovals: vi.fn(),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  checkWriteEndpointLimit: vi.fn(() => Promise.resolve(null)),
  checkReadEndpointLimit: vi.fn(() => Promise.resolve(null)),
}));

import { auth } from '@/lib/auth';
import { workflowEngine } from '@/lib/workflow';

const mockContext = { params: Promise.resolve({}) };

const mockSession = {
  user: { id: 'user-1', email: 'admin@test.com', role: 'admin', name: 'Admin User' },
};

function createPostRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Workflow API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockSession);
  });

  // ===========================================================================
  // POST /api/workflows - Start a new workflow
  // ===========================================================================
  describe('POST /api/workflows', () => {
    let POST: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../workflows/route');
      POST = module.POST;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = createPostRequest('http://localhost:3000/api/workflows', {
        workflowCode: 'PO_APPROVAL',
        entityType: 'PURCHASE_ORDER',
        entityId: 'po-1',
        initiatedBy: 'user-1',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should create workflow instance successfully', async () => {
      (workflowEngine.startWorkflow as Mock).mockResolvedValue({
        success: true,
        instanceId: 'wf-instance-1',
        status: 'PENDING',
      });

      const request = createPostRequest('http://localhost:3000/api/workflows', {
        workflowCode: 'PO_APPROVAL',
        entityType: 'PURCHASE_ORDER',
        entityId: 'po-1',
        initiatedBy: 'user-1',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.instanceId).toBe('wf-instance-1');
      expect(data.status).toBe('PENDING');
      expect(workflowEngine.startWorkflow).toHaveBeenCalledWith({
        workflowCode: 'PO_APPROVAL',
        entityType: 'PURCHASE_ORDER',
        entityId: 'po-1',
        initiatedBy: 'user-1',
        contextData: undefined,
      });
    });

    it('should accept optional contextData', async () => {
      (workflowEngine.startWorkflow as Mock).mockResolvedValue({
        success: true,
        instanceId: 'wf-instance-2',
        status: 'PENDING',
      });

      const request = createPostRequest('http://localhost:3000/api/workflows', {
        workflowCode: 'PO_APPROVAL',
        entityType: 'PURCHASE_ORDER',
        entityId: 'po-1',
        initiatedBy: 'user-1',
        contextData: { amount: 50000, department: 'Engineering' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 for invalid entityType', async () => {
      const request = createPostRequest('http://localhost:3000/api/workflows', {
        workflowCode: 'PO_APPROVAL',
        entityType: 'INVALID_TYPE',
        entityId: 'po-1',
        initiatedBy: 'user-1',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid entityType');
    });

    it('should return 400 for missing required fields', async () => {
      const request = createPostRequest('http://localhost:3000/api/workflows', {
        workflowCode: 'PO_APPROVAL',
        // missing entityType, entityId, initiatedBy
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should return 400 when workflow engine fails to start', async () => {
      (workflowEngine.startWorkflow as Mock).mockResolvedValue({
        success: false,
        error: 'Workflow definition not found',
      });

      const request = createPostRequest('http://localhost:3000/api/workflows', {
        workflowCode: 'NONEXISTENT',
        entityType: 'PURCHASE_ORDER',
        entityId: 'po-1',
        initiatedBy: 'user-1',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
    });
  });

  // ===========================================================================
  // POST /api/workflows/approvals - Approve step
  // ===========================================================================
  describe('POST /api/workflows/approvals', () => {
    let POST: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../workflows/approvals/route');
      POST = module.POST;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = createPostRequest('http://localhost:3000/api/workflows/approvals', {
        instanceId: 'wf-1',
        approverId: 'user-1',
        decision: 'approve',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('should approve step successfully', async () => {
      (workflowEngine.approveStep as Mock).mockResolvedValue({
        success: true,
        status: 'APPROVED',
      });

      const request = createPostRequest('http://localhost:3000/api/workflows/approvals', {
        instanceId: 'wf-1',
        approverId: 'user-1',
        decision: 'approve',
        comments: 'Looks good',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.status).toBe('APPROVED');
      expect(workflowEngine.approveStep).toHaveBeenCalledWith({
        instanceId: 'wf-1',
        approverId: 'user-1',
        comments: 'Looks good',
      });
    });

    it('should reject step with comments', async () => {
      (workflowEngine.rejectStep as Mock).mockResolvedValue({
        success: true,
        status: 'REJECTED',
      });

      const request = createPostRequest('http://localhost:3000/api/workflows/approvals', {
        instanceId: 'wf-1',
        approverId: 'user-1',
        decision: 'reject',
        comments: 'Budget exceeds limit',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.status).toBe('REJECTED');
      expect(workflowEngine.rejectStep).toHaveBeenCalledWith({
        instanceId: 'wf-1',
        approverId: 'user-1',
        comments: 'Budget exceeds limit',
      });
    });

    it('should return 400 when rejecting without comments', async () => {
      const request = createPostRequest('http://localhost:3000/api/workflows/approvals', {
        instanceId: 'wf-1',
        approverId: 'user-1',
        decision: 'reject',
        // no comments
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Comments are required');
    });

    it('should return 400 for invalid decision', async () => {
      const request = createPostRequest('http://localhost:3000/api/workflows/approvals', {
        instanceId: 'wf-1',
        approverId: 'user-1',
        decision: 'maybe',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('approve');
    });

    it('should return 400 for missing required fields', async () => {
      const request = createPostRequest('http://localhost:3000/api/workflows/approvals', {
        instanceId: 'wf-1',
        // missing approverId, decision
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should return 400 when workflow engine approve fails', async () => {
      (workflowEngine.approveStep as Mock).mockResolvedValue({
        success: false,
        error: 'Step already completed',
      });

      const request = createPostRequest('http://localhost:3000/api/workflows/approvals', {
        instanceId: 'wf-1',
        approverId: 'user-1',
        decision: 'approve',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Step already completed');
    });
  });

  // ===========================================================================
  // GET /api/workflows/approvals - List pending approvals
  // ===========================================================================
  describe('GET /api/workflows/approvals', () => {
    let GET: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../workflows/approvals/route');
      GET = module.GET;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/workflows/approvals?userId=user-1');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('should return pending approvals for user', async () => {
      (workflowEngine.getPendingApprovals as Mock).mockResolvedValue([
        { id: 'approval-1', instanceId: 'wf-1', stepName: 'Manager Review' },
        { id: 'approval-2', instanceId: 'wf-2', stepName: 'Finance Approval' },
      ]);

      const request = new NextRequest('http://localhost:3000/api/workflows/approvals?userId=user-1');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.approvals).toHaveLength(2);
      expect(data.count).toBe(2);
    });

    it('should return 400 when userId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/workflows/approvals');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('userId');
    });
  });
});
