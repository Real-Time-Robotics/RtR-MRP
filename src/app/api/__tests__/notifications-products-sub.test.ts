/**
 * Notifications Sub-Routes & Products API Tests
 *
 * Tests for routes NOT covered in notifications-search-discussions.test.ts:
 *  - POST /api/notifications/[id]/read    (mark single notification as read)
 *  - POST /api/notifications/read-all     (mark all as read)
 *  - GET  /api/notifications/settings     (get user notification settings)
 *  - PUT  /api/notifications/settings     (update user notification settings)
 *  - GET  /api/products                   (list products)
 *  - POST /api/products                   (create product)
 *  - GET  /api/products/[id]              (get single product)
 *  - PUT  /api/products/[id]              (update product)
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks (must be declared before importing route modules)
// ---------------------------------------------------------------------------

vi.mock('@/lib/prisma', () => ({
  default: {
    notification: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    workCenter: {
      findUnique: vi.fn(),
    },
  },
  prisma: {
    notification: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    workCenter: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    logError: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/pagination', () => ({
  parsePaginationParams: vi.fn().mockReturnValue({
    page: 1,
    pageSize: 20,
  }),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { POST as NotifReadPOST } from '../notifications/[id]/read/route';
import { POST as ReadAllPOST } from '../notifications/read-all/route';
import { GET as SettingsGET, PUT as SettingsPUT } from '../notifications/settings/route';
import { GET as ProductsGET, POST as ProductsPOST } from '../products/route';
import { GET as ProductIdGET, PUT as ProductIdPUT } from '../products/[id]/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ctxWithId = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
const emptyCtx = { params: Promise.resolve({}) } as never;

function authed(overrides: Record<string, unknown> = {}) {
  (auth as Mock).mockResolvedValue({
    user: { id: 'user-1', name: 'Test', email: 'test@test.com', role: 'admin', ...overrides },
  });
}

function unauthed() {
  (auth as Mock).mockResolvedValue(null);
}

function makeReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

// ===========================================================================
// TEST SUITES
// ===========================================================================

describe('Notifications Sub-Routes & Products API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // POST /api/notifications/[id]/read
  // =========================================================================
  describe('POST /api/notifications/[id]/read', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/notifications/notif-1/read', { method: 'POST' });
      const res = await NotifReadPOST(req, ctxWithId('notif-1'));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 404 when notification not found or not owned', async () => {
      authed();
      (prisma.notification.findFirst as Mock).mockResolvedValue(null);

      const req = makeReq('http://localhost:3000/api/notifications/notif-99/read', { method: 'POST' });
      const res = await NotifReadPOST(req, ctxWithId('notif-99'));
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('Notification not found');
    });

    it('should mark notification as read successfully', async () => {
      authed();
      (prisma.notification.findFirst as Mock).mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        isRead: false,
      });
      (prisma.notification.update as Mock).mockResolvedValue({
        id: 'notif-1',
        isRead: true,
        readAt: new Date(),
      });

      const req = makeReq('http://localhost:3000/api/notifications/notif-1/read', { method: 'POST' });
      const res = await NotifReadPOST(req, ctxWithId('notif-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(prisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'notif-1' },
          data: expect.objectContaining({ isRead: true }),
        })
      );
    });

    it('should return 500 when database fails', async () => {
      authed();
      (prisma.notification.findFirst as Mock).mockRejectedValue(new Error('DB error'));

      const req = makeReq('http://localhost:3000/api/notifications/notif-1/read', { method: 'POST' });
      const res = await NotifReadPOST(req, ctxWithId('notif-1'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to mark notification as read');
    });
  });

  // =========================================================================
  // POST /api/notifications/read-all
  // =========================================================================
  describe('POST /api/notifications/read-all', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/notifications/read-all', { method: 'POST' });
      const res = await ReadAllPOST(req, emptyCtx);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should mark all notifications as read', async () => {
      authed();
      (prisma.notification.updateMany as Mock).mockResolvedValue({ count: 5 });

      const req = makeReq('http://localhost:3000/api/notifications/read-all', { method: 'POST' });
      const res = await ReadAllPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isRead: false },
          data: expect.objectContaining({ isRead: true }),
        })
      );
    });

    it('should return 500 when database fails', async () => {
      authed();
      (prisma.notification.updateMany as Mock).mockRejectedValue(new Error('DB error'));

      const req = makeReq('http://localhost:3000/api/notifications/read-all', { method: 'POST' });
      const res = await ReadAllPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to mark all as read');
    });
  });

  // =========================================================================
  // GET /api/notifications/settings
  // =========================================================================
  describe('GET /api/notifications/settings', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/notifications/settings');
      const res = await SettingsGET(req, emptyCtx);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return notification settings with defaults', async () => {
      authed();
      (prisma.user.findUnique as Mock).mockResolvedValue({
        notificationSettings: null,
        notifyOnMention: true,
        notifyOnReply: true,
        notifyByEmail: true,
      });

      const req = makeReq('http://localhost:3000/api/notifications/settings');
      const res = await SettingsGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.email.enabled).toBe(true);
      expect(body.data.push.enabled).toBe(false);
      expect(body.data.digest.frequency).toBe('never');
    });

    it('should return 404 when user not found', async () => {
      authed();
      (prisma.user.findUnique as Mock).mockResolvedValue(null);

      const req = makeReq('http://localhost:3000/api/notifications/settings');
      const res = await SettingsGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('User not found');
    });

    it('should return 500 when database fails', async () => {
      authed();
      (prisma.user.findUnique as Mock).mockRejectedValue(new Error('DB error'));

      const req = makeReq('http://localhost:3000/api/notifications/settings');
      const res = await SettingsGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to fetch notification settings');
    });
  });

  // =========================================================================
  // PUT /api/notifications/settings
  // =========================================================================
  describe('PUT /api/notifications/settings', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/notifications/settings', {
        method: 'PUT',
        body: JSON.stringify({ email: { enabled: false, onOrder: false, onStock: false, onQuality: false, onMention: false, onApproval: false } }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await SettingsPUT(req, emptyCtx);
      expect(res.status).toBe(401);
    });

    it('should update notification settings successfully', async () => {
      authed();
      (prisma.user.findUnique as Mock).mockResolvedValue({
        notificationSettings: {},
      });
      (prisma.user.update as Mock).mockResolvedValue({ id: 'user-1' });

      const req = makeReq('http://localhost:3000/api/notifications/settings', {
        method: 'PUT',
        body: JSON.stringify({
          email: { enabled: false, onOrder: true, onStock: false, onQuality: true, onMention: true, onApproval: false },
          digest: { enabled: true, frequency: 'daily' },
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await SettingsPUT(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Settings updated successfully');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            notifyByEmail: false,
          }),
        })
      );
    });

    it('should return 400 when validation fails (invalid frequency)', async () => {
      authed();
      const req = makeReq('http://localhost:3000/api/notifications/settings', {
        method: 'PUT',
        body: JSON.stringify({
          digest: { enabled: true, frequency: 'monthly' },
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await SettingsPUT(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Invalid input');
    });

    it('should return 500 when database fails', async () => {
      authed();
      (prisma.user.findUnique as Mock).mockResolvedValue({ notificationSettings: {} });
      (prisma.user.update as Mock).mockRejectedValue(new Error('DB error'));

      const req = makeReq('http://localhost:3000/api/notifications/settings', {
        method: 'PUT',
        body: JSON.stringify({
          push: { enabled: true },
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await SettingsPUT(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to update notification settings');
    });
  });

  // =========================================================================
  // GET /api/products
  // =========================================================================
  describe('GET /api/products', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/products');
      const res = await ProductsGET(req, emptyCtx);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return paginated products list', async () => {
      authed();
      const mockProducts = [
        { id: 'p-1', sku: 'SKU-001', name: 'Widget A', status: 'active' },
        { id: 'p-2', sku: 'SKU-002', name: 'Widget B', status: 'active' },
      ];
      (prisma.product.findMany as Mock).mockResolvedValue(mockProducts);
      (prisma.product.count as Mock).mockResolvedValue(2);

      const req = makeReq('http://localhost:3000/api/products');
      const res = await ProductsGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.total).toBe(2);
    });

    it('should return 500 when database fails', async () => {
      authed();
      (prisma.product.findMany as Mock).mockRejectedValue(new Error('DB error'));

      const req = makeReq('http://localhost:3000/api/products');
      const res = await ProductsGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to fetch products');
    });
  });

  // =========================================================================
  // POST /api/products
  // =========================================================================
  describe('POST /api/products', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify({ sku: 'SKU-NEW', name: 'New Product' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await ProductsPOST(req, emptyCtx);
      expect(res.status).toBe(401);
    });

    it('should return 400 when validation fails (missing required fields)', async () => {
      authed();
      const req = makeReq('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify({ sku: '' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await ProductsPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Validation failed');
    });

    it('should return 400 when SKU already exists', async () => {
      authed();
      (prisma.product.findUnique as Mock).mockResolvedValue({ id: 'existing', sku: 'SKU-DUP' });

      const req = makeReq('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify({ sku: 'SKU-DUP', name: 'Duplicate' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await ProductsPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain('SKU-DUP');
    });

    it('should create product successfully', async () => {
      authed();
      (prisma.product.findUnique as Mock).mockResolvedValue(null); // no SKU conflict
      const mockCreated = {
        id: 'p-new',
        sku: 'SKU-NEW',
        name: 'New Product',
        status: 'active',
        defaultWorkCenter: null,
      };
      (prisma.product.create as Mock).mockResolvedValue(mockCreated);

      const req = makeReq('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify({ sku: 'SKU-NEW', name: 'New Product' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await ProductsPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.sku).toBe('SKU-NEW');
      expect(body.name).toBe('New Product');
    });

    it('should return 400 when defaultWorkCenterId does not exist', async () => {
      authed();
      // First findUnique call checks SKU - no conflict
      // Second findUnique call checks workCenter - not found
      (prisma.product.findUnique as Mock).mockResolvedValue(null);
      (prisma.workCenter.findUnique as Mock).mockResolvedValue(null);

      const req = makeReq('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify({
          sku: 'SKU-WC',
          name: 'Product with WC',
          defaultWorkCenterId: 'nonexistent-wc',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await ProductsPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain('Work center');
    });

    it('should return 500 when database fails on create', async () => {
      authed();
      (prisma.product.findUnique as Mock).mockResolvedValue(null);
      (prisma.product.create as Mock).mockRejectedValue(new Error('DB error'));

      const req = makeReq('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify({ sku: 'SKU-ERR', name: 'Error Product' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await ProductsPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to create product');
    });
  });

  // =========================================================================
  // GET /api/products/[id]
  // =========================================================================
  describe('GET /api/products/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/products/p-1');
      const res = await ProductIdGET(req, ctxWithId('p-1'));
      expect(res.status).toBe(401);
    });

    it('should return product by id', async () => {
      authed();
      const mockProduct = {
        id: 'p-1',
        sku: 'SKU-001',
        name: 'Widget A',
        status: 'active',
        defaultWorkCenter: { id: 'wc-1', name: 'CNC Lathe' },
        _count: { bomHeaders: 2 },
      };
      (prisma.product.findUnique as Mock).mockResolvedValue(mockProduct);

      const req = makeReq('http://localhost:3000/api/products/p-1');
      const res = await ProductIdGET(req, ctxWithId('p-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.sku).toBe('SKU-001');
      expect(body._count.bomHeaders).toBe(2);
    });

    it('should return 404 when product not found', async () => {
      authed();
      (prisma.product.findUnique as Mock).mockResolvedValue(null);

      const req = makeReq('http://localhost:3000/api/products/nonexistent');
      const res = await ProductIdGET(req, ctxWithId('nonexistent'));
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('Product not found');
    });

    it('should return 500 when database fails', async () => {
      authed();
      (prisma.product.findUnique as Mock).mockRejectedValue(new Error('DB error'));

      const req = makeReq('http://localhost:3000/api/products/p-1');
      const res = await ProductIdGET(req, ctxWithId('p-1'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to fetch product');
    });
  });

  // =========================================================================
  // PUT /api/products/[id]
  // =========================================================================
  describe('PUT /api/products/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/products/p-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await ProductIdPUT(req, ctxWithId('p-1'));
      expect(res.status).toBe(401);
    });

    it('should update product name successfully', async () => {
      authed();
      (prisma.product.findUnique as Mock).mockResolvedValue({
        id: 'p-1',
        sku: 'SKU-001',
        name: 'Old Name',
      });
      const mockUpdated = { id: 'p-1', sku: 'SKU-001', name: 'Updated Name' };
      (prisma.product.update as Mock).mockResolvedValue(mockUpdated);

      const req = makeReq('http://localhost:3000/api/products/p-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await ProductIdPUT(req, ctxWithId('p-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.name).toBe('Updated Name');
    });

    it('should return 404 when product not found', async () => {
      authed();
      (prisma.product.findUnique as Mock).mockResolvedValue(null);

      const req = makeReq('http://localhost:3000/api/products/nonexistent', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await ProductIdPUT(req, ctxWithId('nonexistent'));
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('Product not found');
    });

    it('should return 400 when changing to duplicate SKU', async () => {
      authed();
      // First call: find existing product (the one being updated)
      (prisma.product.findUnique as Mock)
        .mockResolvedValueOnce({ id: 'p-1', sku: 'SKU-001', name: 'Product 1' })
        // Second call: check SKU uniqueness - found conflict
        .mockResolvedValueOnce({ id: 'p-2', sku: 'SKU-DUP' });

      const req = makeReq('http://localhost:3000/api/products/p-1', {
        method: 'PUT',
        body: JSON.stringify({ sku: 'SKU-DUP' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await ProductIdPUT(req, ctxWithId('p-1'));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain('SKU-DUP');
    });

    it('should return 400 when validation fails', async () => {
      authed();
      const req = makeReq('http://localhost:3000/api/products/p-1', {
        method: 'PUT',
        body: JSON.stringify({ name: '' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await ProductIdPUT(req, ctxWithId('p-1'));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Validation failed');
    });

    it('should return 500 when database fails on update', async () => {
      authed();
      (prisma.product.findUnique as Mock).mockResolvedValue({
        id: 'p-1',
        sku: 'SKU-001',
        name: 'Product 1',
      });
      (prisma.product.update as Mock).mockRejectedValue(new Error('DB error'));

      const req = makeReq('http://localhost:3000/api/products/p-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'New Name' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await ProductIdPUT(req, ctxWithId('p-1'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to update product');
    });
  });
});
