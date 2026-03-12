/**
 * Analytics API Routes Tests
 * Tests for analytics, analytics/dashboards, analytics/dashboards/[id],
 * analytics/kpis, analytics/templates
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
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

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
  checkHeavyEndpointLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    part: {
      count: vi.fn().mockResolvedValue(100),
    },
    inventory: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    salesOrder: {
      count: vi.fn().mockResolvedValue(50),
      aggregate: vi.fn().mockResolvedValue({ _sum: { totalAmount: 250000 } }),
      findMany: vi.fn().mockResolvedValue([]),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    salesOrderLine: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    workOrder: {
      count: vi.fn().mockResolvedValue(10),
      findMany: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { completedQty: 500, scrapQty: 10 } }),
    },
    nCR: {
      count: vi.fn().mockResolvedValue(5),
      findMany: vi.fn().mockResolvedValue([]),
    },
    cAPA: {
      count: vi.fn().mockResolvedValue(3),
      findMany: vi.fn().mockResolvedValue([]),
    },
    supplier: {
      count: vi.fn().mockResolvedValue(25),
      findMany: vi.fn().mockResolvedValue([]),
    },
    partCertification: {
      count: vi.fn().mockResolvedValue(2),
    },
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

vi.mock('@/lib/analytics', () => ({
  dashboardService: {
    getUserDashboardsWithRole: vi.fn(),
    getUserPermissions: vi.fn().mockReturnValue({
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canShare: true,
      canViewAll: true,
      maxDashboards: 10,
    }),
    getUserFeatures: vi.fn().mockReturnValue({
      advancedCharts: true,
      exportData: true,
    }),
    canUserCreateDashboard: vi.fn().mockResolvedValue(true),
    canUserAccessTemplate: vi.fn().mockReturnValue(true),
    getTemplatesForRole: vi.fn(),
    getDefaultDashboardForRole: vi.fn(),
    getDashboard: vi.fn(),
    createDashboard: vi.fn(),
    createFromTemplate: vi.fn(),
    updateDashboard: vi.fn(),
    deleteDashboard: vi.fn(),
    getTemplates: vi.fn(),
    seedTemplates: vi.fn(),
  },
  widgetService: {
    getMultipleWidgetsData: vi.fn(),
  },
  kpiService: {
    getKPIDefinitions: vi.fn(),
    seedSystemKPIs: vi.fn(),
  },
}));

import { auth } from '@/lib/auth';
import { dashboardService, kpiService } from '@/lib/analytics';

const mockContext = { params: Promise.resolve({}) };
const mockContextWithId = { params: Promise.resolve({ id: 'dash-1' }) };

const mockSession = {
  user: { id: 'user-1', email: 'test@test.com', role: 'ADMIN', name: 'Test User' },
};

function createGetRequest(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

function createPostRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function createPutRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function createDeleteRequest(url: string): NextRequest {
  return new NextRequest(url, { method: 'DELETE' });
}

// =============================================================================
// ANALYTICS MAIN ROUTE TESTS
// =============================================================================
describe('Analytics API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockSession);
  });

  describe('GET /api/analytics', () => {
    let GET: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../analytics/route');
      GET = module.GET;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);
      const request = createGetRequest('http://localhost:3000/api/analytics');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return analytics data with all metric categories', async () => {
      const request = createGetRequest('http://localhost:3000/api/analytics?period=6m');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.period).toBe('6m');
      expect(data.dateRange).toBeDefined();
      expect(data.metrics).toBeDefined();
      expect(data.metrics.inventory).toBeDefined();
      expect(data.metrics.sales).toBeDefined();
      expect(data.metrics.production).toBeDefined();
      expect(data.metrics.quality).toBeDefined();
      expect(data.metrics.suppliers).toBeDefined();
      expect(data.metrics.compliance).toBeDefined();
      expect(data.charts).toBeDefined();
    });

    it('should include cache header in response', async () => {
      const request = createGetRequest('http://localhost:3000/api/analytics');
      const response = await GET(request, mockContext);

      expect(response.headers.get('Cache-Control')).toContain('max-age=60');
    });
  });

  // =============================================================================
  // DASHBOARDS LIST & CREATE TESTS
  // =============================================================================
  describe('GET /api/analytics/dashboards', () => {
    let GET: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../analytics/dashboards/route');
      GET = module.GET;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);
      const request = createGetRequest('http://localhost:3000/api/analytics/dashboards');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return user dashboards list', async () => {
      const mockDashboards = [
        { id: 'dash-1', name: 'My Dashboard', widgets: [], isPublic: false },
        { id: 'dash-2', name: 'Public Dashboard', widgets: [], isPublic: true },
      ];
      (dashboardService.getUserDashboardsWithRole as Mock).mockResolvedValue(mockDashboards);

      const request = createGetRequest('http://localhost:3000/api/analytics/dashboards');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.permissions).toBeDefined();
    });

    it('should return 500 on service error', async () => {
      (dashboardService.getUserDashboardsWithRole as Mock).mockRejectedValue(
        new Error('Service error')
      );

      const request = createGetRequest('http://localhost:3000/api/analytics/dashboards');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch dashboards');
    });
  });

  describe('POST /api/analytics/dashboards', () => {
    let POST: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../analytics/dashboards/route');
      POST = module.POST;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);
      const request = createPostRequest('http://localhost:3000/api/analytics/dashboards', {
        name: 'New Dashboard',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should create a new dashboard successfully', async () => {
      const newDashboard = { id: 'dash-new', name: 'New Dashboard', widgets: [] };
      (dashboardService.createDashboard as Mock).mockResolvedValue(newDashboard);

      const request = createPostRequest('http://localhost:3000/api/analytics/dashboards', {
        name: 'New Dashboard',
        description: 'A test dashboard',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('New Dashboard');
    });

    it('should return 400 for invalid input (empty name)', async () => {
      const request = createPostRequest('http://localhost:3000/api/analytics/dashboards', {
        name: '', // min length 1
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 403 when user cannot create dashboards', async () => {
      (dashboardService.canUserCreateDashboard as Mock).mockResolvedValue(false);

      const request = createPostRequest('http://localhost:3000/api/analytics/dashboards', {
        name: 'New Dashboard',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Permission denied');
    });
  });

  // =============================================================================
  // DASHBOARD [id] TESTS
  // =============================================================================
  describe('GET /api/analytics/dashboards/[id]', () => {
    let GET: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../analytics/dashboards/[id]/route');
      GET = module.GET;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);
      const request = createGetRequest('http://localhost:3000/api/analytics/dashboards/dash-1');
      const response = await GET(request, mockContextWithId);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return dashboard by id', async () => {
      const mockDashboard = {
        id: 'dash-1',
        name: 'My Dashboard',
        userId: 'user-1',
        isPublic: false,
        widgets: [],
      };
      (dashboardService.getDashboard as Mock).mockResolvedValue(mockDashboard);

      const request = createGetRequest('http://localhost:3000/api/analytics/dashboards/dash-1');
      const response = await GET(request, mockContextWithId);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('dash-1');
      expect(data.permissions).toBeDefined();
    });

    it('should return 404 when dashboard not found', async () => {
      (dashboardService.getDashboard as Mock).mockResolvedValue(null);

      const request = createGetRequest('http://localhost:3000/api/analytics/dashboards/nonexistent');
      const response = await GET(request, mockContextWithId);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Dashboard not found');
    });
  });

  describe('PUT /api/analytics/dashboards/[id]', () => {
    let PUT: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../analytics/dashboards/[id]/route');
      PUT = module.PUT;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);
      const request = createPutRequest('http://localhost:3000/api/analytics/dashboards/dash-1', {
        name: 'Updated Name',
      });
      const response = await PUT(request, mockContextWithId);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should update dashboard successfully', async () => {
      const existing = {
        id: 'dash-1',
        name: 'Old Name',
        userId: 'user-1',
        isPublic: false,
        widgets: [],
      };
      (dashboardService.getDashboard as Mock).mockResolvedValue(existing);
      (dashboardService.updateDashboard as Mock).mockResolvedValue({
        ...existing,
        name: 'Updated Name',
      });

      const request = createPutRequest('http://localhost:3000/api/analytics/dashboards/dash-1', {
        name: 'Updated Name',
      });
      const response = await PUT(request, mockContextWithId);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Name');
    });

    it('should return 404 when dashboard not found', async () => {
      (dashboardService.getDashboard as Mock).mockResolvedValue(null);

      const request = createPutRequest('http://localhost:3000/api/analytics/dashboards/nonexistent', {
        name: 'Updated Name',
      });
      const response = await PUT(request, mockContextWithId);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 403 when user does not own dashboard', async () => {
      const existing = {
        id: 'dash-1',
        name: 'Other Dashboard',
        userId: 'other-user',
        isPublic: false,
        widgets: [],
      };
      (dashboardService.getDashboard as Mock).mockResolvedValue(existing);

      const request = createPutRequest('http://localhost:3000/api/analytics/dashboards/dash-1', {
        name: 'Updated Name',
      });
      const response = await PUT(request, mockContextWithId);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Permission denied');
    });
  });

  describe('DELETE /api/analytics/dashboards/[id]', () => {
    let DELETE: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../analytics/dashboards/[id]/route');
      DELETE = module.DELETE;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);
      const request = createDeleteRequest('http://localhost:3000/api/analytics/dashboards/dash-1');
      const response = await DELETE(request, mockContextWithId);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should delete dashboard successfully', async () => {
      const existing = {
        id: 'dash-1',
        name: 'Dashboard to Delete',
        userId: 'user-1',
        isPublic: false,
        widgets: [],
      };
      (dashboardService.getDashboard as Mock).mockResolvedValue(existing);
      (dashboardService.deleteDashboard as Mock).mockResolvedValue(undefined);

      const request = createDeleteRequest('http://localhost:3000/api/analytics/dashboards/dash-1');
      const response = await DELETE(request, mockContextWithId);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Dashboard deleted');
    });

    it('should return 404 when dashboard not found', async () => {
      (dashboardService.getDashboard as Mock).mockResolvedValue(null);

      const request = createDeleteRequest('http://localhost:3000/api/analytics/dashboards/nonexistent');
      const response = await DELETE(request, mockContextWithId);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 403 when user does not own dashboard', async () => {
      const existing = {
        id: 'dash-1',
        name: 'Other Dashboard',
        userId: 'other-user',
        isPublic: false,
        widgets: [],
      };
      (dashboardService.getDashboard as Mock).mockResolvedValue(existing);

      const request = createDeleteRequest('http://localhost:3000/api/analytics/dashboards/dash-1');
      const response = await DELETE(request, mockContextWithId);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Permission denied');
    });
  });

  // =============================================================================
  // KPIs TESTS
  // =============================================================================
  describe('GET /api/analytics/kpis', () => {
    let GET: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../analytics/kpis/route');
      GET = module.GET;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);
      const request = createGetRequest('http://localhost:3000/api/analytics/kpis');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return KPI definitions', async () => {
      const mockKPIs = [
        { id: 'kpi-1', name: 'Inventory Turnover', category: 'inventory', value: 4.2 },
        { id: 'kpi-2', name: 'On-Time Delivery', category: 'production', value: 92.5 },
      ];
      (kpiService.getKPIDefinitions as Mock).mockResolvedValue(mockKPIs);

      const request = createGetRequest('http://localhost:3000/api/analytics/kpis');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
    });

    it('should return 500 on service error', async () => {
      (kpiService.getKPIDefinitions as Mock).mockRejectedValue(new Error('Service error'));

      const request = createGetRequest('http://localhost:3000/api/analytics/kpis');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch KPI definitions');
    });
  });

  describe('POST /api/analytics/kpis', () => {
    let POST: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../analytics/kpis/route');
      POST = module.POST;
    });

    it('should seed system KPIs successfully', async () => {
      (kpiService.seedSystemKPIs as Mock).mockResolvedValue(undefined);

      const request = createPostRequest('http://localhost:3000/api/analytics/kpis', {});
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('System KPIs seeded successfully');
    });

    it('should return 500 on seed error', async () => {
      (kpiService.seedSystemKPIs as Mock).mockRejectedValue(new Error('Seed error'));

      const request = createPostRequest('http://localhost:3000/api/analytics/kpis', {});
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to seed KPIs');
    });
  });

  // =============================================================================
  // TEMPLATES TESTS
  // =============================================================================
  describe('GET /api/analytics/templates', () => {
    let GET: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../analytics/templates/route');
      GET = module.GET;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);
      const request = createGetRequest('http://localhost:3000/api/analytics/templates');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return templates list', async () => {
      const mockTemplates = [
        { id: 'tpl-1', name: 'Production Overview', category: 'production' },
        { id: 'tpl-2', name: 'Inventory Dashboard', category: 'inventory' },
      ];
      (dashboardService.getTemplates as Mock).mockResolvedValue(mockTemplates);

      const request = createGetRequest('http://localhost:3000/api/analytics/templates');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
    });

    it('should return 500 on service error', async () => {
      (dashboardService.getTemplates as Mock).mockRejectedValue(new Error('Service error'));

      const request = createGetRequest('http://localhost:3000/api/analytics/templates');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch templates');
    });
  });
});
