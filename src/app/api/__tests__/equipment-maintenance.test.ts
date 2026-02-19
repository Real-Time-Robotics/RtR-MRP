/**
 * Equipment & Maintenance API Route Tests
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before imports
vi.mock('@/lib/prisma', () => ({
  default: {
    equipment: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    maintenanceOrder: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    maintenanceSchedule: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    threadParticipant: {
      create: vi.fn(),
    },
  },
  prisma: {
    equipment: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    maintenanceOrder: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    maintenanceSchedule: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    threadParticipant: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
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

import { GET as getEquipmentList, POST as postEquipment } from '../equipment/route';
import { GET as getEquipmentById, PUT as putEquipment, DELETE as deleteEquipment, PATCH as patchEquipment } from '../equipment/[id]/route';
import { GET as getMaintenanceList, POST as postMaintenance } from '../maintenance/route';
import { GET as getMaintenanceById, PUT as putMaintenance, PATCH as patchMaintenance, DELETE as deleteMaintenance } from '../maintenance/[id]/route';
import { auth } from '@/lib/auth';

// Use default import since equipment/maintenance routes use `import prisma from "@/lib/prisma"`
import prisma from '@/lib/prisma';

const mockContext = { params: Promise.resolve({}) };
const mockIdContext = { params: Promise.resolve({ id: 'test-id-1' }) };
const mockSession = { user: { id: 'user1', email: 'test@test.com', name: 'Test User', role: 'ADMIN' } };

describe('Equipment API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/equipment
  // ===========================================================================
  describe('GET /api/equipment', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/equipment');
      const response = await getEquipmentList(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should return paginated equipment list successfully', async () => {
      const mockEquipment = [
        {
          id: 'eq-1',
          code: 'EQ-001',
          name: 'CNC Mill',
          type: 'machining',
          status: 'operational',
          workCenter: { id: 'wc-1', code: 'WC-001', name: 'Machine Shop' },
          _count: { maintenanceOrders: 2, maintenanceSchedules: 1 },
        },
        {
          id: 'eq-2',
          code: 'EQ-002',
          name: 'Lathe',
          type: 'machining',
          status: 'operational',
          workCenter: { id: 'wc-1', code: 'WC-001', name: 'Machine Shop' },
          _count: { maintenanceOrders: 0, maintenanceSchedules: 0 },
        },
      ];

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.equipment.count as Mock).mockResolvedValue(2);
      (prisma.equipment.findMany as Mock).mockResolvedValue(mockEquipment);

      const request = new NextRequest('http://localhost:3000/api/equipment');
      const response = await getEquipmentList(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.totalItems).toBe(2);
    });

    it('should return 500 when database query fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.equipment.count as Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/equipment');
      const response = await getEquipmentList(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  // ===========================================================================
  // POST /api/equipment
  // ===========================================================================
  describe('POST /api/equipment', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/equipment', {
        method: 'POST',
        body: JSON.stringify({ code: 'EQ-001', name: 'CNC Mill', type: 'machining', workCenterId: 'wc-1' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await postEquipment(request, mockContext);

      expect(response.status).toBe(401);
    });

    it('should create equipment successfully', async () => {
      const mockCreated = {
        id: 'eq-new',
        code: 'EQ-NEW',
        name: 'New CNC',
        type: 'machining',
        status: 'operational',
        workCenterId: 'wc-1',
        workCenter: { id: 'wc-1', code: 'WC-001', name: 'Machine Shop' },
      };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.equipment.create as Mock).mockResolvedValue(mockCreated);

      const request = new NextRequest('http://localhost:3000/api/equipment', {
        method: 'POST',
        body: JSON.stringify({
          code: 'EQ-NEW',
          name: 'New CNC',
          type: 'machining',
          workCenterId: 'wc-1',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await postEquipment(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.code).toBe('EQ-NEW');
    });

    it('should return 400 when required fields are missing', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/equipment', {
        method: 'POST',
        body: JSON.stringify({ name: 'Missing fields' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await postEquipment(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  // ===========================================================================
  // GET /api/equipment/[id]
  // ===========================================================================
  describe('GET /api/equipment/[id]', () => {
    it('should return equipment by ID', async () => {
      const mockEq = {
        id: 'test-id-1',
        code: 'EQ-001',
        name: 'CNC Mill',
        type: 'machining',
        status: 'operational',
        workCenter: { id: 'wc-1', code: 'WC-001', name: 'Machine Shop', type: 'manufacturing' },
        maintenanceSchedules: [],
        maintenanceOrders: [],
      };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.equipment.findUnique as Mock).mockResolvedValue(mockEq);

      const request = new NextRequest('http://localhost:3000/api/equipment/test-id-1');
      const response = await getEquipmentById(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.code).toBe('EQ-001');
    });

    it('should return 404 when equipment not found', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.equipment.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/equipment/nonexistent');
      const response = await getEquipmentById(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Equipment not found');
    });
  });

  // ===========================================================================
  // PUT /api/equipment/[id]
  // ===========================================================================
  describe('PUT /api/equipment/[id]', () => {
    it('should update equipment successfully', async () => {
      const mockUpdated = {
        id: 'test-id-1',
        code: 'EQ-001',
        name: 'Updated CNC Mill',
        status: 'operational',
        workCenter: { id: 'wc-1', code: 'WC-001', name: 'Machine Shop' },
      };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.equipment.update as Mock).mockResolvedValue(mockUpdated);

      const request = new NextRequest('http://localhost:3000/api/equipment/test-id-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated CNC Mill' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await putEquipment(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Updated CNC Mill');
    });

    it('should return 400 when validation fails with invalid data types', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/equipment/test-id-1', {
        method: 'PUT',
        body: JSON.stringify({ maintenanceIntervalDays: -5 }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await putEquipment(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  // ===========================================================================
  // DELETE /api/equipment/[id]
  // ===========================================================================
  describe('DELETE /api/equipment/[id]', () => {
    it('should delete equipment successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.equipment.delete as Mock).mockResolvedValue({ id: 'test-id-1' });

      const request = new NextRequest('http://localhost:3000/api/equipment/test-id-1', {
        method: 'DELETE',
      });
      const response = await deleteEquipment(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 500 when delete fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.equipment.delete as Mock).mockRejectedValue(new Error('FK constraint'));

      const request = new NextRequest('http://localhost:3000/api/equipment/test-id-1', {
        method: 'DELETE',
      });
      const response = await deleteEquipment(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  // ===========================================================================
  // PATCH /api/equipment/[id] - OEE Update
  // ===========================================================================
  describe('PATCH /api/equipment/[id]', () => {
    it('should update OEE metrics successfully', async () => {
      const mockUpdated = {
        id: 'test-id-1',
        availability: 95,
        performance: 90,
        quality: 99,
        currentOee: 84.645,
        lastOeeUpdate: new Date().toISOString(),
      };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.equipment.update as Mock).mockResolvedValue(mockUpdated);

      const request = new NextRequest('http://localhost:3000/api/equipment/test-id-1', {
        method: 'PATCH',
        body: JSON.stringify({ availability: 95, performance: 90, quality: 99 }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await patchEquipment(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availability).toBe(95);
    });
  });
});

describe('Maintenance API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/maintenance
  // ===========================================================================
  describe('GET /api/maintenance', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/maintenance');
      const response = await getMaintenanceList(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should return paginated maintenance orders', async () => {
      const mockOrders = [
        {
          id: 'mo-1',
          orderNumber: 'MO-000001',
          type: 'PM',
          status: 'pending',
          priority: 'medium',
          title: 'Monthly inspection',
          equipment: { id: 'eq-1', code: 'EQ-001', name: 'CNC Mill', status: 'operational' },
          schedule: null,
        },
      ];

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.maintenanceOrder.count as Mock).mockResolvedValue(1);
      (prisma.maintenanceOrder.findMany as Mock).mockResolvedValue(mockOrders);

      const request = new NextRequest('http://localhost:3000/api/maintenance');
      const response = await getMaintenanceList(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.pagination.totalItems).toBe(1);
    });

    it('should return 500 when database query fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.maintenanceOrder.count as Mock).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/maintenance');
      const response = await getMaintenanceList(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  // ===========================================================================
  // POST /api/maintenance
  // ===========================================================================
  describe('POST /api/maintenance', () => {
    it('should create a maintenance order successfully', async () => {
      const mockCreated = {
        id: 'mo-new',
        orderNumber: 'MO-000001',
        equipmentId: 'eq-1',
        type: 'PM',
        priority: 'medium',
        title: 'Scheduled Maintenance',
        status: 'pending',
        equipment: { id: 'eq-1', code: 'EQ-001', name: 'CNC Mill' },
      };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.maintenanceOrder.findFirst as Mock).mockResolvedValue(null);
      (prisma.maintenanceOrder.create as Mock).mockResolvedValue(mockCreated);

      const request = new NextRequest('http://localhost:3000/api/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          equipmentId: 'eq-1',
          type: 'PM',
          title: 'Scheduled Maintenance',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await postMaintenance(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.orderNumber).toBe('MO-000001');
    });

    it('should return 400 when required fields are missing', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/maintenance', {
        method: 'POST',
        body: JSON.stringify({ description: 'Missing required fields' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await postMaintenance(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should update equipment status for emergency maintenance', async () => {
      const mockCreated = {
        id: 'mo-em',
        orderNumber: 'MO-000002',
        equipmentId: 'eq-1',
        type: 'EM',
        priority: 'emergency',
        title: 'Emergency Repair',
        status: 'pending',
        equipment: { id: 'eq-1', code: 'EQ-001', name: 'CNC Mill' },
      };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.maintenanceOrder.findFirst as Mock).mockResolvedValue({ orderNumber: 'MO-000001' });
      (prisma.maintenanceOrder.create as Mock).mockResolvedValue(mockCreated);
      (prisma.equipment.update as Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          equipmentId: 'eq-1',
          type: 'EM',
          priority: 'emergency',
          title: 'Emergency Repair',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await postMaintenance(request, mockContext);

      expect(response.status).toBe(201);
      expect(prisma.equipment.update).toHaveBeenCalledWith({
        where: { id: 'eq-1' },
        data: { status: 'maintenance' },
      });
    });
  });

  // ===========================================================================
  // GET /api/maintenance/[id]
  // ===========================================================================
  describe('GET /api/maintenance/[id]', () => {
    it('should return maintenance order by ID', async () => {
      const mockOrder = {
        id: 'test-id-1',
        orderNumber: 'MO-000001',
        type: 'PM',
        status: 'pending',
        equipment: {
          id: 'eq-1', code: 'EQ-001', name: 'CNC Mill', type: 'machining', status: 'operational',
          workCenter: { id: 'wc-1', code: 'WC-001', name: 'Machine Shop' },
        },
        schedule: null,
      };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.maintenanceOrder.findUnique as Mock).mockResolvedValue(mockOrder);

      const request = new NextRequest('http://localhost:3000/api/maintenance/test-id-1');
      const response = await getMaintenanceById(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.orderNumber).toBe('MO-000001');
    });

    it('should return 404 when maintenance order not found', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.maintenanceOrder.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/maintenance/nonexistent');
      const response = await getMaintenanceById(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Maintenance order not found');
    });
  });

  // ===========================================================================
  // PUT /api/maintenance/[id]
  // ===========================================================================
  describe('PUT /api/maintenance/[id]', () => {
    it('should update maintenance order successfully', async () => {
      const mockUpdated = {
        id: 'test-id-1',
        orderNumber: 'MO-000001',
        status: 'scheduled',
        priority: 'high',
        equipment: { id: 'eq-1', code: 'EQ-001', name: 'CNC Mill' },
      };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.maintenanceOrder.update as Mock).mockResolvedValue(mockUpdated);

      const request = new NextRequest('http://localhost:3000/api/maintenance/test-id-1', {
        method: 'PUT',
        body: JSON.stringify({ status: 'scheduled', priority: 'high' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await putMaintenance(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('scheduled');
    });
  });

  // ===========================================================================
  // PATCH /api/maintenance/[id] - Status actions
  // ===========================================================================
  describe('PATCH /api/maintenance/[id]', () => {
    it('should start a maintenance order', async () => {
      const mockUpdated = {
        id: 'test-id-1',
        status: 'in_progress',
        actualStartDate: new Date().toISOString(),
        equipmentId: 'eq-1',
        equipment: { id: 'eq-1', maintenanceIntervalDays: null },
      };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.maintenanceOrder.update as Mock).mockResolvedValue(mockUpdated);

      const request = new NextRequest('http://localhost:3000/api/maintenance/test-id-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'start' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await patchMaintenance(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('in_progress');
    });

    it('should complete a maintenance order and update equipment', async () => {
      const mockUpdated = {
        id: 'test-id-1',
        status: 'completed',
        equipmentId: 'eq-1',
        scheduleId: null,
        equipment: { id: 'eq-1', maintenanceIntervalDays: 30 },
      };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.maintenanceOrder.update as Mock).mockResolvedValue(mockUpdated);
      (prisma.equipment.update as Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/maintenance/test-id-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'complete', workPerformed: 'Replaced bearings' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await patchMaintenance(request, mockIdContext);

      expect(response.status).toBe(200);
      expect(prisma.equipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'eq-1' },
          data: expect.objectContaining({ status: 'operational' }),
        })
      );
    });

    it('should return 400 for invalid action', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/maintenance/test-id-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'invalid_action' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await patchMaintenance(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action');
    });
  });

  // ===========================================================================
  // DELETE /api/maintenance/[id]
  // ===========================================================================
  describe('DELETE /api/maintenance/[id]', () => {
    it('should delete maintenance order successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.maintenanceOrder.delete as Mock).mockResolvedValue({ id: 'test-id-1' });

      const request = new NextRequest('http://localhost:3000/api/maintenance/test-id-1', {
        method: 'DELETE',
      });
      const response = await deleteMaintenance(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 500 when delete fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.maintenanceOrder.delete as Mock).mockRejectedValue(new Error('FK constraint'));

      const request = new NextRequest('http://localhost:3000/api/maintenance/test-id-1', {
        method: 'DELETE',
      });
      const response = await deleteMaintenance(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
