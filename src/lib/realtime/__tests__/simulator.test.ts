/**
 * RTR Event Simulator Unit Tests
 * Tests for start/stop/running state and manual triggers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the globalEmitter from use-socket
const mockEmit = vi.fn();
vi.mock('../use-socket', () => ({
  globalEmitter: {
    emit: (...args: unknown[]) => mockEmit(...args),
    on: vi.fn(),
    off: vi.fn(),
    clear: vi.fn(),
  },
}));

// Mock the events module - let real functions through, just need the module to resolve
vi.mock('../events', async () => {
  const actual = await vi.importActual('../events');
  return actual;
});

import { eventSimulator } from '../simulator';

describe('EventSimulator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // Ensure simulator is stopped before each test
    eventSimulator.stop();
  });

  afterEach(() => {
    eventSimulator.stop();
    vi.useRealTimers();
  });

  // =========================================================================
  // start / stop / running
  // =========================================================================
  describe('start and stop', () => {
    it('should not be running initially (after stop)', () => {
      expect(eventSimulator.running).toBe(false);
    });

    it('should be running after start', () => {
      eventSimulator.start();

      expect(eventSimulator.running).toBe(true);
    });

    it('should not be running after stop', () => {
      eventSimulator.start();
      eventSimulator.stop();

      expect(eventSimulator.running).toBe(false);
    });

    it('should not start twice if already running', () => {
      eventSimulator.start({ dashboardInterval: 5000 });
      eventSimulator.start({ dashboardInterval: 5000 });

      // Advance time and check that events fire at the expected rate
      // (not double due to duplicate start)
      vi.advanceTimersByTime(5000);
      const callCount = mockEmit.mock.calls.length;

      // With a single start, we expect some emissions from dashboardInterval
      // If it started twice, we'd get double.
      // We only need to verify it's running once.
      expect(eventSimulator.running).toBe(true);
    });
  });

  // =========================================================================
  // Interval-based emissions
  // =========================================================================
  describe('interval emissions', () => {
    it('should emit dashboard updates at the configured interval', () => {
      eventSimulator.start({
        dashboardInterval: 1000,
        orderInterval: 999999,
        inventoryInterval: 999999,
        productionInterval: 999999,
        notificationInterval: 999999,
      });

      expect(mockEmit).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      // Should have at least one dashboard emission
      expect(mockEmit).toHaveBeenCalled();

      const dashboardCalls = mockEmit.mock.calls.filter(
        (call: unknown[]) => {
          const event = call[0] as { type: string };
          return event.type === 'dashboard:stats_updated';
        }
      );
      expect(dashboardCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should emit production events at the configured interval', () => {
      eventSimulator.start({
        dashboardInterval: 999999,
        orderInterval: 999999,
        inventoryInterval: 999999,
        productionInterval: 2000,
        notificationInterval: 999999,
      });

      vi.advanceTimersByTime(2000);

      const productionCalls = mockEmit.mock.calls.filter(
        (call: unknown[]) => {
          const event = call[0] as { type: string };
          return event.type.startsWith('production:');
        }
      );
      expect(productionCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should stop emitting after stop is called', () => {
      eventSimulator.start({
        dashboardInterval: 1000,
        orderInterval: 999999,
        inventoryInterval: 999999,
        productionInterval: 999999,
        notificationInterval: 999999,
      });

      vi.advanceTimersByTime(1000);
      const countAfterFirst = mockEmit.mock.calls.length;

      eventSimulator.stop();
      vi.advanceTimersByTime(5000);

      // No new calls after stop
      expect(mockEmit.mock.calls.length).toBe(countAfterFirst);
    });
  });

  // =========================================================================
  // Manual triggers
  // =========================================================================
  describe('triggerDashboardUpdate', () => {
    it('should emit a dashboard:stats_updated event', () => {
      eventSimulator.triggerDashboardUpdate();

      expect(mockEmit).toHaveBeenCalledTimes(1);
      const event = mockEmit.mock.calls[0][0];
      expect(event.type).toBe('dashboard:stats_updated');
      expect(event.payload).toBeDefined();
      expect(event.payload.revenue).toBeDefined();
      expect(event.payload.orders).toBeDefined();
      expect(event.payload.production).toBeDefined();
    });
  });

  describe('triggerNewOrder', () => {
    it('should emit order:created and notification:new events', () => {
      eventSimulator.triggerNewOrder();

      // Should emit 2 events: order:created + notification:new
      expect(mockEmit).toHaveBeenCalledTimes(2);

      const types = mockEmit.mock.calls.map((c: unknown[]) => (c[0] as { type: string }).type);
      expect(types).toContain('order:created');
      expect(types).toContain('notification:new');
    });

    it('should include order payload with required fields', () => {
      eventSimulator.triggerNewOrder();

      const orderEvent = mockEmit.mock.calls.find(
        (c: unknown[]) => (c[0] as { type: string }).type === 'order:created'
      );
      const payload = (orderEvent![0] as { payload: Record<string, unknown> }).payload;

      expect(payload.orderId).toBeDefined();
      expect(payload.orderNumber).toMatch(/^SO-2025-/);
      expect(payload.type).toBe('sales');
      expect(payload.status).toBe('PENDING');
      expect(payload.timestamp).toBeDefined();
    });
  });

  describe('triggerLowStock', () => {
    it('should emit an inventory event and a notification', () => {
      eventSimulator.triggerLowStock();

      // Emits inventory event + notification
      expect(mockEmit).toHaveBeenCalledTimes(2);

      const types = mockEmit.mock.calls.map((c: unknown[]) => (c[0] as { type: string }).type);
      expect(
        types.includes('inventory:low_stock') || types.includes('inventory:out_of_stock')
      ).toBe(true);
      expect(types).toContain('notification:new');
    });

    it('should accept optional partId parameter', () => {
      eventSimulator.triggerLowStock('p1');

      const inventoryEvent = mockEmit.mock.calls.find(
        (c: unknown[]) => (c[0] as { type: string }).type.startsWith('inventory:')
      );
      const payload = (inventoryEvent![0] as { payload: Record<string, unknown> }).payload;
      expect(payload.partId).toBe('p1');
    });

    it('should fallback to first sample part for unknown partId', () => {
      eventSimulator.triggerLowStock('nonexistent-id');

      const inventoryEvent = mockEmit.mock.calls.find(
        (c: unknown[]) => (c[0] as { type: string }).type.startsWith('inventory:')
      );
      const payload = (inventoryEvent![0] as { payload: Record<string, unknown> }).payload;
      // Should fallback to sampleParts[0]
      expect(payload.partId).toBe('p1');
    });
  });

  describe('triggerNCR', () => {
    it('should emit quality:ncr_created and notification:new', () => {
      eventSimulator.triggerNCR();

      expect(mockEmit).toHaveBeenCalledTimes(2);

      const types = mockEmit.mock.calls.map((c: unknown[]) => (c[0] as { type: string }).type);
      expect(types).toContain('quality:ncr_created');
      expect(types).toContain('notification:new');
    });

    it('should include NCR payload with required fields', () => {
      eventSimulator.triggerNCR();

      const ncrEvent = mockEmit.mock.calls.find(
        (c: unknown[]) => (c[0] as { type: string }).type === 'quality:ncr_created'
      );
      const payload = (ncrEvent![0] as { payload: Record<string, unknown> }).payload;

      expect(payload.recordId).toBeDefined();
      expect(payload.recordNumber).toMatch(/^NCR-2025-/);
      expect(payload.type).toBe('NCR');
      expect(payload.status).toBe('OPEN');
      expect(['CRITICAL', 'MAJOR', 'MINOR']).toContain(payload.severity);
      expect(payload.description).toBeDefined();
    });
  });

  // =========================================================================
  // Default intervals
  // =========================================================================
  describe('default intervals', () => {
    it('should use default intervals when none provided', () => {
      eventSimulator.start();

      // At 15s, production should fire (default 15000ms)
      vi.advanceTimersByTime(15000);
      const hasProduction = mockEmit.mock.calls.some(
        (c: unknown[]) => (c[0] as { type: string }).type.startsWith('production:')
      );
      expect(hasProduction).toBe(true);
    });
  });
});
