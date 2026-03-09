/**
 * RTR Real-time Events Unit Tests
 * Tests for helper functions, priority, labels, and icons
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createEvent,
  createNotification,
  getEventPriority,
  getEventLabel,
  getEventIcon,
  eventPriority,
  eventLabels,
  eventIcons,
  type RTREventType,
  type RTREvent,
  type NotificationPayload,
} from '../events';

describe('RTR Events', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // createEvent
  // =========================================================================
  describe('createEvent', () => {
    it('should create an event with type, payload, and timestamp', () => {
      const payload = { orderId: 'o1', value: 42 };
      const event = createEvent('order:created', payload);

      expect(event.type).toBe('order:created');
      expect(event.payload).toEqual(payload);
      expect(event.timestamp).toBeDefined();
      expect(new Date(event.timestamp).getTime()).not.toBeNaN();
      expect(event.source).toBeUndefined();
      expect(event.userId).toBeUndefined();
    });

    it('should include source and userId when provided', () => {
      const event = createEvent('dashboard:stats_updated', { x: 1 }, {
        source: 'simulator',
        userId: 'user-1',
      });

      expect(event.source).toBe('simulator');
      expect(event.userId).toBe('user-1');
    });

    it('should handle empty payload', () => {
      const event = createEvent('system:broadcast', {});

      expect(event.payload).toEqual({});
    });
  });

  // =========================================================================
  // createNotification
  // =========================================================================
  describe('createNotification', () => {
    it('should create a notification with required fields', () => {
      const notif = createNotification('info', 'Test Title', 'Test message');

      expect(notif.type).toBe('info');
      expect(notif.title).toBe('Test Title');
      expect(notif.message).toBe('Test message');
      expect(notif.read).toBe(false);
      expect(notif.id).toMatch(/^notif-/);
      expect(notif.timestamp).toBeDefined();
      expect(notif.link).toBeUndefined();
      expect(notif.icon).toBeUndefined();
    });

    it('should include link and icon when provided', () => {
      const notif = createNotification('warning', 'Alert', 'Low stock', {
        link: '/inventory/p1',
        icon: 'Package',
      });

      expect(notif.link).toBe('/inventory/p1');
      expect(notif.icon).toBe('Package');
    });

    it('should generate unique IDs', () => {
      const n1 = createNotification('info', 'A', 'B');
      const n2 = createNotification('info', 'A', 'B');

      expect(n1.id).not.toBe(n2.id);
    });

    it('should support all notification types', () => {
      const types: NotificationPayload['type'][] = ['info', 'success', 'warning', 'error'];

      for (const t of types) {
        const notif = createNotification(t, 'T', 'M');
        expect(notif.type).toBe(t);
      }
    });
  });

  // =========================================================================
  // getEventPriority
  // =========================================================================
  describe('getEventPriority', () => {
    it('should return correct priority for known event types', () => {
      expect(getEventPriority('inventory:out_of_stock')).toBe(100);
      expect(getEventPriority('quality:ncr_created')).toBe(90);
      expect(getEventPriority('production:issue')).toBe(85);
      expect(getEventPriority('inventory:low_stock')).toBe(80);
      expect(getEventPriority('order:created')).toBe(70);
      expect(getEventPriority('production:completed')).toBe(60);
      expect(getEventPriority('dashboard:stats_updated')).toBe(20);
    });

    it('should return 0 for unknown event types', () => {
      expect(getEventPriority('notification:new')).toBe(0);
      expect(getEventPriority('system:user_connected')).toBe(0);
    });
  });

  // =========================================================================
  // getEventLabel
  // =========================================================================
  describe('getEventLabel', () => {
    it('should return Vietnamese labels for known events', () => {
      expect(getEventLabel('order:created')).toBe('Đơn hàng mới');
      expect(getEventLabel('inventory:low_stock')).toBe('Tồn kho thấp');
      expect(getEventLabel('inventory:out_of_stock')).toBe('Hết hàng');
      expect(getEventLabel('production:completed')).toBe('Hoàn thành sản xuất');
      expect(getEventLabel('quality:ncr_created')).toBe('NCR mới');
    });

    it('should return the event type string for unlisted events', () => {
      // All events are actually listed, so this tests the fallback path.
      // We cast to bypass type checking to test the fallback.
      const unknownType = 'unknown:event' as RTREventType;
      expect(getEventLabel(unknownType)).toBe('unknown:event');
    });
  });

  // =========================================================================
  // getEventIcon
  // =========================================================================
  describe('getEventIcon', () => {
    it('should return correct icon for event categories', () => {
      expect(getEventIcon('dashboard:stats_updated')).toBe('LayoutDashboard');
      expect(getEventIcon('order:created')).toBe('ShoppingCart');
      expect(getEventIcon('inventory:updated')).toBe('Package');
      expect(getEventIcon('production:started')).toBe('Factory');
      expect(getEventIcon('quality:ncr_created')).toBe('CheckCircle');
      expect(getEventIcon('mrp:run_started')).toBe('Calculator');
      expect(getEventIcon('system:broadcast')).toBe('Settings');
      expect(getEventIcon('notification:new')).toBe('Bell');
    });

    it('should return "Info" for unknown category', () => {
      const unknownType = 'unknown:event' as RTREventType;
      expect(getEventIcon(unknownType)).toBe('Info');
    });
  });

  // =========================================================================
  // eventPriority map
  // =========================================================================
  describe('eventPriority', () => {
    it('should have priorities in descending order of severity', () => {
      expect(eventPriority['inventory:out_of_stock']).toBeGreaterThan(
        eventPriority['inventory:low_stock']
      );
      expect(eventPriority['quality:ncr_created']).toBeGreaterThan(
        eventPriority['order:created']
      );
    });
  });

  // =========================================================================
  // eventLabels map
  // =========================================================================
  describe('eventLabels', () => {
    it('should have labels for all core event categories', () => {
      const categories = [
        'dashboard:stats_updated',
        'order:created',
        'inventory:updated',
        'production:started',
        'quality:ncr_created',
        'mrp:run_started',
        'system:broadcast',
        'notification:new',
      ];

      for (const cat of categories) {
        expect(eventLabels[cat as RTREventType]).toBeDefined();
        expect(typeof eventLabels[cat as RTREventType]).toBe('string');
      }
    });
  });

  // =========================================================================
  // eventIcons map
  // =========================================================================
  describe('eventIcons', () => {
    it('should have icons for standard categories', () => {
      expect(eventIcons['dashboard']).toBe('LayoutDashboard');
      expect(eventIcons['order']).toBe('ShoppingCart');
      expect(eventIcons['inventory']).toBe('Package');
      expect(eventIcons['production']).toBe('Factory');
      expect(eventIcons['quality']).toBe('CheckCircle');
      expect(eventIcons['mrp']).toBe('Calculator');
      expect(eventIcons['system']).toBe('Settings');
      expect(eventIcons['notification']).toBe('Bell');
    });
  });
});
