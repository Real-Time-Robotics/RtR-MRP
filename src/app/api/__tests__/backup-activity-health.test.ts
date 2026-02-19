/**
 * Backup, Activity, Audit Logs, Dashboard Role, and Health API Route Tests
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks - must be declared before importing route handlers
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    activityLog: {
      findMany: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    warehouse: {
      count: vi.fn(),
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
  checkHeavyEndpointLimit: vi.fn().mockResolvedValue(null),
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

vi.mock('@/lib/backup/backup-service', () => ({
  listBackups: vi.fn(),
  createBackup: vi.fn(),
  cleanupOldBackups: vi.fn(),
  getBackup: vi.fn(),
  getBackupFile: vi.fn(),
  getBackupSchedule: vi.fn(),
  updateBackupSchedule: vi.fn(),
}));

vi.mock('@/lib/dashboard/role-dashboard-service', () => ({
  getRoleDashboard: vi.fn(),
}));

vi.mock('@/lib/monitoring/health', () => ({
  checkLiveness: vi.fn(),
  checkReadiness: vi.fn(),
  checkHealth: vi.fn(),
  getHealthHttpStatus: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  listBackups,
  createBackup,
  cleanupOldBackups,
  getBackup,
  getBackupFile,
  getBackupSchedule,
  updateBackupSchedule,
} from '@/lib/backup/backup-service';
import { getRoleDashboard } from '@/lib/dashboard/role-dashboard-service';
import {
  checkLiveness,
  checkReadiness,
  checkHealth,
  getHealthHttpStatus,
} from '@/lib/monitoring/health';

import { GET as backupListGET, POST as backupPOST } from '../backup/route';
import { GET as backupIdGET } from '../backup/[id]/route';
import { GET as scheduleGET, PUT as schedulePUT } from '../backup/schedule/route';
import { GET as activityGET } from '../activity/route';
import { GET as auditLogsGET } from '../audit-logs/route';
import { GET as dashboardRoleGET } from '../dashboard/role/route';
import { GET as healthGET } from '../health/route';
import { GET as healthCheckGET } from '../health/[check]/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockContext = { params: Promise.resolve({}) };
const mockIdContext = (id: string) => ({ params: Promise.resolve({ id }) });
const adminSession = {
  user: { id: 'user-1', name: 'Admin', email: 'admin@test.com', role: 'admin' },
};
const managerSession = {
  user: { id: 'user-2', name: 'Manager', email: 'mgr@test.com', role: 'manager' },
};
const viewerSession = {
  user: { id: 'user-3', name: 'Viewer', email: 'viewer@test.com', role: 'viewer' },
};

// ============================================================================
// TESTS
// ============================================================================

describe('Backup API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- GET /api/backup ----------
  describe('GET /api/backup', () => {
    it('should list backups for admin users', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      const mockBackups = [
        { id: 'b1', name: 'daily-backup', type: 'AUTO', createdAt: new Date().toISOString() },
        { id: 'b2', name: 'manual-snap', type: 'MANUAL', createdAt: new Date().toISOString() },
      ];
      vi.mocked(listBackups).mockResolvedValue(mockBackups as any);

      const request = new NextRequest('http://localhost:3000/api/backup?limit=10');
      const response = await backupListGET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockBackups);
      expect(listBackups).toHaveBeenCalledWith({ limit: 10, type: undefined });
    });

    it('should return 403 for viewer role', async () => {
      (auth as Mock).mockResolvedValue(viewerSession);

      const request = new NextRequest('http://localhost:3000/api/backup');
      const response = await backupListGET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 500 when listBackups throws', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      vi.mocked(listBackups).mockRejectedValue(new Error('disk error'));

      const request = new NextRequest('http://localhost:3000/api/backup');
      const response = await backupListGET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to list backups');
    });
  });

  // ---------- POST /api/backup ----------
  describe('POST /api/backup', () => {
    it('should create a backup for admin users', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      vi.mocked(createBackup).mockResolvedValue({
        success: true,
        backupId: 'b-new',
        filePath: '/backups/b-new.sql',
        fileSize: 1024,
        duration: 350,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        body: JSON.stringify({ type: 'MANUAL', name: 'my-backup' }),
      });
      const response = await backupPOST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.backupId).toBe('b-new');
      expect(createBackup).toHaveBeenCalledWith({
        type: 'MANUAL',
        name: 'my-backup',
        userId: 'user-1',
      });
    });

    it('should return 403 for manager role (admin only)', async () => {
      (auth as Mock).mockResolvedValue(managerSession);

      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        body: JSON.stringify({ type: 'MANUAL' }),
      });
      const response = await backupPOST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 400 for invalid backup type', async () => {
      (auth as Mock).mockResolvedValue(adminSession);

      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        body: JSON.stringify({ type: 'INVALID_TYPE' }),
      });
      const response = await backupPOST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    it('should return 500 when createBackup fails', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      vi.mocked(createBackup).mockResolvedValue({
        success: false,
        error: 'Disk full',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        body: JSON.stringify({ type: 'MANUAL' }),
      });
      const response = await backupPOST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Disk full');
    });
  });

  // ---------- GET /api/backup/[id] ----------
  describe('GET /api/backup/[id]', () => {
    it('should return backup details by id', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      const mockBackup = { id: 'b1', name: 'daily-backup', type: 'AUTO', size: 2048 };
      vi.mocked(getBackup).mockResolvedValue(mockBackup as any);

      const request = new NextRequest('http://localhost:3000/api/backup/b1');
      const response = await backupIdGET(request, mockIdContext('b1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockBackup);
    });

    it('should return 404 when backup not found', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      vi.mocked(getBackup).mockResolvedValue(null as any);

      const request = new NextRequest('http://localhost:3000/api/backup/missing');
      const response = await backupIdGET(request, mockIdContext('missing'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Backup not found');
    });

    it('should return 403 for viewer role', async () => {
      (auth as Mock).mockResolvedValue(viewerSession);

      const request = new NextRequest('http://localhost:3000/api/backup/b1');
      const response = await backupIdGET(request, mockIdContext('b1'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });
  });

  // ---------- GET /api/backup/schedule ----------
  describe('GET /api/backup/schedule', () => {
    it('should return backup schedule for admin', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      const mockSchedule = { enabled: true, frequency: 'DAILY', timeOfDay: '02:00', retention: 30 };
      vi.mocked(getBackupSchedule).mockResolvedValue(mockSchedule as any);

      const request = new NextRequest('http://localhost:3000/api/backup/schedule');
      const response = await scheduleGET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSchedule);
    });

    it('should return 403 for viewer role', async () => {
      (auth as Mock).mockResolvedValue(viewerSession);

      const request = new NextRequest('http://localhost:3000/api/backup/schedule');
      const response = await scheduleGET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });
  });

  // ---------- PUT /api/backup/schedule ----------
  describe('PUT /api/backup/schedule', () => {
    it('should update schedule for admin', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      const updated = { enabled: false, frequency: 'WEEKLY', timeOfDay: '03:00', retention: 60 };
      vi.mocked(updateBackupSchedule).mockResolvedValue(updated as any);

      const request = new NextRequest('http://localhost:3000/api/backup/schedule', {
        method: 'PUT',
        body: JSON.stringify({ enabled: false, frequency: 'WEEKLY' }),
      });
      const response = await schedulePUT(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(updated);
    });

    it('should return 403 for manager (admin only for PUT)', async () => {
      (auth as Mock).mockResolvedValue(managerSession);

      const request = new NextRequest('http://localhost:3000/api/backup/schedule', {
        method: 'PUT',
        body: JSON.stringify({ enabled: false }),
      });
      const response = await schedulePUT(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 400 for invalid schedule input', async () => {
      (auth as Mock).mockResolvedValue(adminSession);

      const request = new NextRequest('http://localhost:3000/api/backup/schedule', {
        method: 'PUT',
        body: JSON.stringify({ frequency: 'HOURLY' }),
      });
      const response = await schedulePUT(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });
  });
});

// ============================================================================
// ACTIVITY API
// ============================================================================

describe('Activity API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/activity', () => {
    it('should return user activities', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      const mockActivities = [
        { id: 'a1', type: 'login', userId: 'user-1', createdAt: new Date() },
        { id: 'a2', type: 'update', userId: 'user-1', createdAt: new Date() },
      ];
      vi.mocked(prisma.activityLog.findMany).mockResolvedValue(mockActivities as any);

      const request = new NextRequest('http://localhost:3000/api/activity?limit=10&days=7');
      const response = await activityGET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.activities).toHaveLength(2);
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/activity');
      const response = await activityGET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 500 when prisma throws', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      vi.mocked(prisma.activityLog.findMany).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/activity');
      const response = await activityGET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch activity');
    });
  });
});

// ============================================================================
// AUDIT LOGS API
// ============================================================================

describe('Audit Logs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/audit-logs', () => {
    it('should return paginated audit logs', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      const mockLogs = [
        {
          id: 'log1',
          userId: 'user-1',
          entityType: 'Part',
          entityId: 'p1',
          entityName: 'Widget A',
          action: 'CREATE',
          oldValues: null,
          newValues: { name: 'Widget A' },
          ipAddress: '127.0.0.1',
          metadata: {},
          createdAt: new Date(),
        },
      ];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs as any);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(1);
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: 'user-1', name: 'Admin', email: 'admin@test.com', role: 'admin' },
      ] as any);

      const request = new NextRequest('http://localhost:3000/api/audit-logs?page=1&limit=10');
      const response = await auditLogsGET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.pagination.total).toBe(1);
      expect(data.pagination.page).toBe(1);
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/audit-logs');
      const response = await auditLogsGET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 500 on database error', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      vi.mocked(prisma.auditLog.findMany).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/audit-logs');
      const response = await auditLogsGET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch audit logs');
    });
  });
});

// ============================================================================
// DASHBOARD ROLE API
// ============================================================================

describe('Dashboard Role API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/dashboard/role', () => {
    it('should return role-based dashboard data', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      const mockDashboard = {
        widgets: ['overview', 'alerts', 'stats'],
        permissions: ['read', 'write'],
      };
      vi.mocked(getRoleDashboard).mockResolvedValue(mockDashboard as any);

      const request = new NextRequest('http://localhost:3000/api/dashboard/role');
      const response = await dashboardRoleGET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockDashboard);
      expect(getRoleDashboard).toHaveBeenCalledWith('user-1', 'admin');
    });

    it('should return 500 when service throws', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      vi.mocked(getRoleDashboard).mockRejectedValue(new Error('Service error'));

      const request = new NextRequest('http://localhost:3000/api/dashboard/role');
      const response = await dashboardRoleGET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch dashboard data');
    });
  });
});

// ============================================================================
// HEALTH API
// ============================================================================

describe('Health API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- GET /api/health (no auth) ----------
  describe('GET /api/health', () => {
    it('should return health status with DB connected', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);

      const response = await healthGET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.database).toBe('connected');
      expect(data.dbElapsedMs).toBeDefined();
      expect(data.dbCheckedAt).toBeDefined();
    });

    it('should return degraded status when DB fails', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('connection refused'));

      const response = await healthGET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
      expect(data.database).toBe('error');
    });
  });

  // ---------- GET /api/health/[check] (no auth) ----------
  describe('GET /api/health/[check]', () => {
    it('should return liveness check for /api/health/live', async () => {
      const mockHealth = { status: 'healthy', timestamp: new Date().toISOString() };
      vi.mocked(checkLiveness).mockReturnValue(mockHealth as any);

      const request = new NextRequest('http://localhost:3000/api/health/live');
      const response = await healthCheckGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
    });

    it('should return readiness check for /api/health/ready', async () => {
      const mockHealth = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: [{ name: 'database', status: 'pass' }],
      };
      vi.mocked(checkReadiness).mockResolvedValue(mockHealth as any);
      vi.mocked(getHealthHttpStatus).mockReturnValue(200);

      const request = new NextRequest('http://localhost:3000/api/health/ready');
      const response = await healthCheckGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
    });

    it('should return 503 when health check throws', async () => {
      vi.mocked(checkLiveness).mockImplementation(() => {
        throw new Error('catastrophic failure');
      });

      const request = new NextRequest('http://localhost:3000/api/health/live');
      const response = await healthCheckGET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.error).toBe('Health check failed');
    });
  });
});
