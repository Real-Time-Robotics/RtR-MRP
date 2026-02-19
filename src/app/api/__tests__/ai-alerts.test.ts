/**
 * AI Alerts API Route Tests
 * Tests for GET/POST /api/ai/alerts, /api/ai/alerts/counts, /api/ai/alerts/digest
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

// Mock alert service methods
const mockGetAlerts = vi.fn();
const mockGetAlert = vi.fn();
const mockGetAlertCounts = vi.fn();
const mockRefreshAlerts = vi.fn();
const mockExecuteAction = vi.fn();
const mockMarkAsRead = vi.fn();
const mockMarkAsDismissed = vi.fn();
const mockBulkMarkAsRead = vi.fn();
const mockBulkDismiss = vi.fn();
const mockGetAISummary = vi.fn();
const mockGetDailyDigest = vi.fn();
const mockGetWeeklyReport = vi.fn();
const mockGetUserPreferences = vi.fn();
const mockUpdateUserPreferences = vi.fn();

const mockBulkSnooze = vi.fn();

vi.mock('@/lib/ai/alerts', () => ({
  unifiedAlertService: {
    getAlerts: (...args: unknown[]) => mockGetAlerts(...args),
    getAlert: (...args: unknown[]) => mockGetAlert(...args),
    getAlertCounts: (...args: unknown[]) => mockGetAlertCounts(...args),
    refreshAlerts: (...args: unknown[]) => mockRefreshAlerts(...args),
    executeAction: (...args: unknown[]) => mockExecuteAction(...args),
    markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
    markAsDismissed: (...args: unknown[]) => mockMarkAsDismissed(...args),
    bulkMarkAsRead: (...args: unknown[]) => mockBulkMarkAsRead(...args),
    bulkDismiss: (...args: unknown[]) => mockBulkDismiss(...args),
    getAISummary: (...args: unknown[]) => mockGetAISummary(...args),
    getDailyDigest: (...args: unknown[]) => mockGetDailyDigest(...args),
    getWeeklyReport: (...args: unknown[]) => mockGetWeeklyReport(...args),
    getUserPreferences: (...args: unknown[]) => mockGetUserPreferences(...args),
    updateUserPreferences: (...args: unknown[]) => mockUpdateUserPreferences(...args),
  },
  aiAlertAnalyzer: {
    predictUrgency: vi.fn().mockResolvedValue({ level: 'HIGH', score: 85 }),
    correlateAlerts: vi.fn().mockResolvedValue([]),
  },
  alertActionExecutor: {
    bulkSnooze: (...args: unknown[]) => mockBulkSnooze(...args),
  },
  // Re-export type stubs to prevent import errors
  AlertFilter: {},
  AlertSort: {},
  AlertPriority: {},
  AlertStatus: {},
  AlertSource: {},
  AlertType: {},
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
  checkHeavyEndpointLimit: vi.fn().mockResolvedValue({ success: true, limit: 100, remaining: 99, retryAfter: 0 }),
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

// Import routes after mocks
import { GET, POST } from '../ai/alerts/route';
import { GET as GET_COUNTS } from '../ai/alerts/counts/route';
import { GET as GET_DIGEST } from '../ai/alerts/digest/route';

// Sample alert data
const sampleAlerts = [
  {
    id: 'alert-1',
    title: 'Low inventory warning',
    priority: 'HIGH',
    status: 'active',
    source: 'inventory',
    type: 'warning',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'alert-2',
    title: 'Supplier delivery late',
    priority: 'MEDIUM',
    status: 'active',
    source: 'supplier',
    type: 'alert',
    isRead: true,
    createdAt: new Date().toISOString(),
  },
];

// Mock context for withAuth wrapper (Next.js 15 async params)
const mockContext = { params: Promise.resolve({}) };

describe('AI Alerts API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/ai/alerts
  // ===========================================================================
  describe('GET /api/ai/alerts', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/alerts');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when session has no user', async () => {
      (auth as Mock).mockResolvedValue({ user: undefined });

      const request = new NextRequest('http://localhost:3000/api/ai/alerts');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return paginated alerts successfully', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      mockGetAlerts.mockReturnValue(sampleAlerts);
      mockGetAlertCounts.mockReturnValue({
        total: 2,
        byPriority: { HIGH: 1, MEDIUM: 1 },
        unread: 1,
      });

      const request = new NextRequest('http://localhost:3000/api/ai/alerts?page=1&limit=50');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.alerts).toHaveLength(2);
      expect(data.data.pagination).toBeDefined();
      expect(data.data.pagination.page).toBe(1);
      expect(data.data.pagination.limit).toBe(50);
      expect(data.data.pagination.total).toBe(2);
      expect(data.data.counts).toBeDefined();
    });

    it('should pass filter params to getAlerts', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      mockGetAlerts.mockReturnValue([]);
      mockGetAlertCounts.mockReturnValue({ total: 0 });

      const request = new NextRequest(
        'http://localhost:3000/api/ai/alerts?priorities=HIGH,CRITICAL&statuses=active&isRead=false'
      );
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockGetAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          priorities: ['HIGH', 'CRITICAL'],
          statuses: ['active'],
          isRead: false,
        }),
        undefined
      );
    });

    it('should handle sort params', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      mockGetAlerts.mockReturnValue([]);
      mockGetAlertCounts.mockReturnValue({ total: 0 });

      const request = new NextRequest(
        'http://localhost:3000/api/ai/alerts?sortField=createdAt&sortDirection=asc'
      );
      const response = await GET(request, mockContext);

      expect(response.status).toBe(200);
      expect(mockGetAlerts).toHaveBeenCalledWith(
        expect.any(Object),
        { field: 'createdAt', direction: 'asc' }
      );
    });

    it('should refresh alerts when refresh=true', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      mockRefreshAlerts.mockResolvedValue(sampleAlerts);
      mockGetAlerts.mockReturnValue(sampleAlerts);
      mockGetAlertCounts.mockReturnValue({ total: 2 });

      const request = new NextRequest(
        'http://localhost:3000/api/ai/alerts?refresh=true'
      );
      const response = await GET(request, mockContext);

      expect(response.status).toBe(200);
      expect(mockRefreshAlerts).toHaveBeenCalled();
    });

    it('should include AI summary when includeSummary=true', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      mockGetAlerts.mockReturnValue(sampleAlerts);
      mockGetAlertCounts.mockReturnValue({ total: 2 });
      mockGetAISummary.mockResolvedValue('There are 2 active alerts requiring attention.');

      const request = new NextRequest(
        'http://localhost:3000/api/ai/alerts?includeSummary=true'
      );
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.aiSummary).toBe('There are 2 active alerts requiring attention.');
      expect(mockGetAISummary).toHaveBeenCalledWith(sampleAlerts);
    });

    it('should return 500 when service throws', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      mockGetAlerts.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const request = new NextRequest('http://localhost:3000/api/ai/alerts');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch alerts');
    });
  });

  // ===========================================================================
  // POST /api/ai/alerts
  // ===========================================================================
  describe('POST /api/ai/alerts', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/alerts', {
        method: 'POST',
        body: JSON.stringify({ action: 'markAsRead', alertId: 'alert-1' }),
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should execute alert action successfully', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      mockExecuteAction.mockResolvedValue({ success: true, message: 'Action executed' });

      const request = new NextRequest('http://localhost:3000/api/ai/alerts', {
        method: 'POST',
        body: JSON.stringify({
          action: 'execute',
          alertId: 'alert-1',
          actionId: 'action-1',
        }),
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockExecuteAction).toHaveBeenCalledWith('alert-1', 'action-1', 'user-1');
    });

    it('should return 400 when execute action is missing alertId or actionId', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

      const request = new NextRequest('http://localhost:3000/api/ai/alerts', {
        method: 'POST',
        body: JSON.stringify({ action: 'execute', alertId: 'alert-1' }),
        // missing actionId
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing alertId or actionId');
    });

    it('should mark alert as read', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      mockMarkAsRead.mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/ai/alerts', {
        method: 'POST',
        body: JSON.stringify({ action: 'markAsRead', alertId: 'alert-1' }),
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockMarkAsRead).toHaveBeenCalledWith('alert-1');
    });

    it('should return 400 when markAsRead is missing alertId', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

      const request = new NextRequest('http://localhost:3000/api/ai/alerts', {
        method: 'POST',
        body: JSON.stringify({ action: 'markAsRead' }),
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing alertId');
    });

    it('should dismiss alert with reason', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      mockMarkAsDismissed.mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/ai/alerts', {
        method: 'POST',
        body: JSON.stringify({
          action: 'dismiss',
          alertId: 'alert-1',
          reason: 'Not relevant',
        }),
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockMarkAsDismissed).toHaveBeenCalledWith('alert-1', 'Not relevant');
    });

    it('should bulk mark as read', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      mockBulkMarkAsRead.mockReturnValue(3);

      const request = new NextRequest('http://localhost:3000/api/ai/alerts', {
        method: 'POST',
        body: JSON.stringify({
          action: 'bulkMarkAsRead',
          alertIds: ['alert-1', 'alert-2', 'alert-3'],
        }),
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBe(3);
    });

    it('should return 400 for bulkMarkAsRead with empty alertIds', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

      const request = new NextRequest('http://localhost:3000/api/ai/alerts', {
        method: 'POST',
        body: JSON.stringify({ action: 'bulkMarkAsRead', alertIds: [] }),
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing alertIds');
    });

    it('should refresh alerts via POST action', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      mockRefreshAlerts.mockResolvedValue(sampleAlerts);

      const request = new NextRequest('http://localhost:3000/api/ai/alerts', {
        method: 'POST',
        body: JSON.stringify({ action: 'refresh' }),
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.count).toBe(2);
    });

    it('should return 400 for invalid action', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

      const request = new NextRequest('http://localhost:3000/api/ai/alerts', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalidAction' }),
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });
  });

  // ===========================================================================
  // GET /api/ai/alerts/counts
  // ===========================================================================
  describe('GET /api/ai/alerts/counts', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/alerts/counts');
      const response = await GET_COUNTS(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return alert counts successfully', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      mockGetAlertCounts.mockReturnValue({
        total: 5,
        byPriority: { CRITICAL: 1, HIGH: 2, MEDIUM: 1, LOW: 1 },
        unread: 3,
      });

      const request = new NextRequest('http://localhost:3000/api/ai/alerts/counts');
      const response = await GET_COUNTS(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.total).toBe(5);
      expect(data.data.unread).toBe(3);
    });

    it('should return 500 when counts service fails', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      mockGetAlertCounts.mockImplementation(() => {
        throw new Error('Counts failed');
      });

      const request = new NextRequest('http://localhost:3000/api/ai/alerts/counts');
      const response = await GET_COUNTS(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch counts');
    });
  });

  // ===========================================================================
  // GET /api/ai/alerts/digest
  // ===========================================================================
  describe('GET /api/ai/alerts/digest', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/alerts/digest');
      const response = await GET_DIGEST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return daily digest by default', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      const mockDigest = {
        period: 'daily',
        summary: '5 alerts today',
        alerts: [],
        createdAt: new Date().toISOString(),
      };
      mockGetDailyDigest.mockResolvedValue(mockDigest);

      const request = new NextRequest('http://localhost:3000/api/ai/alerts/digest');
      const response = await GET_DIGEST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockDigest);
      expect(mockGetDailyDigest).toHaveBeenCalled();
      expect(mockGetWeeklyReport).not.toHaveBeenCalled();
    });

    it('should return weekly report when period=weekly', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      const mockReport = {
        period: 'weekly',
        summary: '20 alerts this week',
        alerts: [],
        createdAt: new Date().toISOString(),
      };
      mockGetWeeklyReport.mockResolvedValue(mockReport);

      const request = new NextRequest(
        'http://localhost:3000/api/ai/alerts/digest?period=weekly'
      );
      const response = await GET_DIGEST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockReport);
      expect(mockGetWeeklyReport).toHaveBeenCalled();
      expect(mockGetDailyDigest).not.toHaveBeenCalled();
    });

    it('should return 500 when digest generation fails', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      mockGetDailyDigest.mockRejectedValue(new Error('Digest failed'));

      const request = new NextRequest('http://localhost:3000/api/ai/alerts/digest');
      const response = await GET_DIGEST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate digest');
    });
  });
});
