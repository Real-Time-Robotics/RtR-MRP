import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockPrisma, mockEmailService } = vi.hoisted(() => ({
  mockPrisma: {
    workflowNotification: {
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    workflowApproval: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
  mockEmailService: {
    sendWorkflowApproval: vi.fn(),
    sendOverdueReminder: vi.fn(),
    sendAlertNotification: vi.fn(),
    send: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  },
}));

vi.mock('@/lib/email/email-service', () => ({
  emailService: mockEmailService,
}));

import { NotificationService, notificationService } from '../notification-service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationService();
  });

  // =========================================================================
  // sendNotification
  // =========================================================================
  describe('sendNotification', () => {
    it('should create a notification and return success', async () => {
      mockPrisma.workflowNotification.create.mockResolvedValue({ id: 'notif-1' });

      const result = await service.sendNotification('inst-1', {
        recipientId: 'user-1',
        type: 'INFO',
        title: 'Test',
        message: 'Hello',
      });

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('notif-1');
      expect(mockPrisma.workflowNotification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          instanceId: 'inst-1',
          recipientId: 'user-1',
          type: 'INFO',
          channel: 'IN_APP',
          title: 'Test',
          message: 'Hello',
          deliveryStatus: 'sent',
        }),
      });
    });

    it('should use provided channel', async () => {
      mockPrisma.workflowNotification.create.mockResolvedValue({ id: 'notif-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'test@test.com', name: 'Test' });
      mockEmailService.send.mockResolvedValue(undefined);

      const result = await service.sendNotification('inst-1', {
        recipientId: 'user-1',
        type: 'OTHER',
        title: 'Test',
        message: 'Hello',
        channel: 'EMAIL',
      });

      expect(result.success).toBe(true);
      const createCall = mockPrisma.workflowNotification.create.mock.calls[0][0];
      expect(createCall.data.channel).toBe('EMAIL');
    });

    it('should send email for EMAIL channel', async () => {
      mockPrisma.workflowNotification.create.mockResolvedValue({ id: 'notif-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'test@test.com', name: 'Test User' });
      mockEmailService.send.mockResolvedValue(undefined);

      await service.sendNotification('inst-1', {
        recipientId: 'user-1',
        type: 'GENERIC',
        title: 'Subject',
        message: 'Body',
        channel: 'EMAIL',
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { email: true, name: true },
      });
      expect(mockEmailService.send).toHaveBeenCalled();
    });

    it('should send APPROVAL_REQUEST email template', async () => {
      mockPrisma.workflowNotification.create.mockResolvedValue({ id: 'notif-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'a@b.com', name: 'Alice' });
      mockEmailService.sendWorkflowApproval.mockResolvedValue(undefined);

      await service.sendNotification('inst-1', {
        recipientId: 'user-1',
        type: 'APPROVAL_REQUEST',
        title: 'PO Approval',
        message: 'Approve please',
        channel: 'EMAIL',
        metadata: { instanceId: 'inst-1', stepName: 'Step 1', submittedBy: 'Bob' },
      });

      expect(mockEmailService.sendWorkflowApproval).toHaveBeenCalledWith(
        'a@b.com',
        'Alice',
        {
          workflowName: 'PO Approval',
          instanceId: 'inst-1',
          stepName: 'Step 1',
          submittedBy: 'Bob',
        }
      );
    });

    it('should send REMINDER email template', async () => {
      mockPrisma.workflowNotification.create.mockResolvedValue({ id: 'notif-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'a@b.com', name: 'Alice' });
      mockEmailService.sendOverdueReminder.mockResolvedValue(undefined);

      await service.sendNotification('inst-1', {
        recipientId: 'user-1',
        type: 'REMINDER',
        title: 'Overdue',
        message: 'Reminder',
        channel: 'EMAIL',
        metadata: { instanceId: 'inst-1', stepName: 'Step 1', dueDate: '2026-03-01' },
      });

      expect(mockEmailService.sendOverdueReminder).toHaveBeenCalledWith(
        'a@b.com',
        'Alice',
        expect.objectContaining({
          workflowName: 'Overdue',
          dueDate: '2026-03-01',
        })
      );
    });

    it('should send ALERT email template', async () => {
      mockPrisma.workflowNotification.create.mockResolvedValue({ id: 'notif-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'a@b.com', name: 'Alice' });
      mockEmailService.sendAlertNotification.mockResolvedValue(undefined);

      await service.sendNotification('inst-1', {
        recipientId: 'user-1',
        type: 'ALERT',
        title: 'Alert Title',
        message: 'Alert msg',
        channel: 'EMAIL',
        actionUrl: '/alerts/1',
        metadata: { alertType: 'MRP', severity: 'high' },
      });

      expect(mockEmailService.sendAlertNotification).toHaveBeenCalledWith(
        'a@b.com',
        'Alice',
        {
          alertType: 'MRP',
          title: 'Alert Title',
          message: 'Alert msg',
          severity: 'high',
          actionUrl: '/alerts/1',
        }
      );
    });

    it('should not send email when user has no email', async () => {
      mockPrisma.workflowNotification.create.mockResolvedValue({ id: 'notif-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ email: null, name: 'No Email' });

      await service.sendNotification('inst-1', {
        recipientId: 'user-1',
        type: 'INFO',
        title: 'Test',
        message: 'Hello',
        channel: 'EMAIL',
      });

      expect(mockEmailService.send).not.toHaveBeenCalled();
      expect(mockEmailService.sendWorkflowApproval).not.toHaveBeenCalled();
    });

    it('should not send email when user not found', async () => {
      mockPrisma.workflowNotification.create.mockResolvedValue({ id: 'notif-1' });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await service.sendNotification('inst-1', {
        recipientId: 'user-1',
        type: 'INFO',
        title: 'Test',
        message: 'Hello',
        channel: 'EMAIL',
      });

      expect(mockEmailService.send).not.toHaveBeenCalled();
    });

    it('should use "User" as fallback name when user.name is null', async () => {
      mockPrisma.workflowNotification.create.mockResolvedValue({ id: 'notif-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'a@b.com', name: null });
      mockEmailService.send.mockResolvedValue(undefined);

      await service.sendNotification('inst-1', {
        recipientId: 'user-1',
        type: 'GENERIC',
        title: 'Test',
        message: 'Hi',
        channel: 'EMAIL',
      });

      const emailCall = mockEmailService.send.mock.calls[0][0];
      expect(emailCall.html).toContain('User');
    });

    it('should not throw when email sending fails', async () => {
      mockPrisma.workflowNotification.create.mockResolvedValue({ id: 'notif-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'a@b.com', name: 'Alice' });
      mockEmailService.send.mockRejectedValue(new Error('SMTP error'));

      const result = await service.sendNotification('inst-1', {
        recipientId: 'user-1',
        type: 'GENERIC',
        title: 'Test',
        message: 'Hi',
        channel: 'EMAIL',
      });

      // Notification still created successfully
      expect(result.success).toBe(true);
    });

    it('should return error on notification creation failure', async () => {
      mockPrisma.workflowNotification.create.mockRejectedValue(
        new Error('DB error')
      );

      const result = await service.sendNotification('inst-1', {
        recipientId: 'user-1',
        type: 'INFO',
        title: 'Test',
        message: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });

    it('should handle non-Error thrown objects', async () => {
      mockPrisma.workflowNotification.create.mockRejectedValue('string error');

      const result = await service.sendNotification('inst-1', {
        recipientId: 'user-1',
        type: 'INFO',
        title: 'Test',
        message: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send notification');
    });

    it('should not call email for IN_APP channel', async () => {
      mockPrisma.workflowNotification.create.mockResolvedValue({ id: 'notif-1' });

      await service.sendNotification('inst-1', {
        recipientId: 'user-1',
        type: 'INFO',
        title: 'Test',
        message: 'Hello',
        channel: 'IN_APP',
      });

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should include actionUrl in notification', async () => {
      mockPrisma.workflowNotification.create.mockResolvedValue({ id: 'notif-1' });

      await service.sendNotification('inst-1', {
        recipientId: 'user-1',
        type: 'INFO',
        title: 'Test',
        message: 'Hello',
        actionUrl: '/dashboard/approvals',
      });

      const createCall = mockPrisma.workflowNotification.create.mock.calls[0][0];
      expect(createCall.data.actionUrl).toBe('/dashboard/approvals');
    });

    it('should use default metadata values when not provided for APPROVAL_REQUEST', async () => {
      mockPrisma.workflowNotification.create.mockResolvedValue({ id: 'notif-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'a@b.com', name: 'Alice' });
      mockEmailService.sendWorkflowApproval.mockResolvedValue(undefined);

      await service.sendNotification('inst-1', {
        recipientId: 'user-1',
        type: 'APPROVAL_REQUEST',
        title: 'Title',
        message: 'Msg',
        channel: 'EMAIL',
      });

      expect(mockEmailService.sendWorkflowApproval).toHaveBeenCalledWith(
        'a@b.com',
        'Alice',
        {
          workflowName: 'Title',
          instanceId: '',
          stepName: 'Approval',
          submittedBy: 'System',
        }
      );
    });
  });

  // =========================================================================
  // sendBulkNotifications
  // =========================================================================
  describe('sendBulkNotifications', () => {
    it('should create notifications for all recipients', async () => {
      mockPrisma.workflowNotification.createMany.mockResolvedValue({ count: 3 });

      const result = await service.sendBulkNotifications('inst-1', {
        recipientIds: ['u1', 'u2', 'u3'],
        type: 'INFO',
        title: 'Bulk Test',
        message: 'Hello all',
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(3);

      const createCall = mockPrisma.workflowNotification.createMany.mock.calls[0][0];
      expect(createCall.data.length).toBe(3);
      expect(createCall.data[0].recipientId).toBe('u1');
      expect(createCall.data[0].channel).toBe('IN_APP');
    });

    it('should use provided channel', async () => {
      mockPrisma.workflowNotification.createMany.mockResolvedValue({ count: 1 });

      await service.sendBulkNotifications('inst-1', {
        recipientIds: ['u1'],
        type: 'INFO',
        title: 'Test',
        message: 'Hi',
        channel: 'EMAIL',
      });

      const createCall = mockPrisma.workflowNotification.createMany.mock.calls[0][0];
      expect(createCall.data[0].channel).toBe('EMAIL');
    });

    it('should return count 0 on error', async () => {
      mockPrisma.workflowNotification.createMany.mockRejectedValue(
        new Error('DB error')
      );

      const result = await service.sendBulkNotifications('inst-1', {
        recipientIds: ['u1'],
        type: 'INFO',
        title: 'Test',
        message: 'Hi',
      });

      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
    });
  });

  // =========================================================================
  // markAsRead
  // =========================================================================
  describe('markAsRead', () => {
    it('should update notification readAt and return true', async () => {
      mockPrisma.workflowNotification.update.mockResolvedValue({});

      const result = await service.markAsRead('notif-1');

      expect(result).toBe(true);
      expect(mockPrisma.workflowNotification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { readAt: expect.any(Date) },
      });
    });

    it('should return false on error', async () => {
      mockPrisma.workflowNotification.update.mockRejectedValue(new Error('Not found'));

      const result = await service.markAsRead('notif-1');
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // markAllAsRead
  // =========================================================================
  describe('markAllAsRead', () => {
    it('should update all unread notifications for user', async () => {
      mockPrisma.workflowNotification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-1');

      expect(result).toBe(5);
      expect(mockPrisma.workflowNotification.updateMany).toHaveBeenCalledWith({
        where: { recipientId: 'user-1', readAt: null },
        data: { readAt: expect.any(Date) },
      });
    });

    it('should return 0 on error', async () => {
      mockPrisma.workflowNotification.updateMany.mockRejectedValue(new Error('err'));

      const result = await service.markAllAsRead('user-1');
      expect(result).toBe(0);
    });
  });

  // =========================================================================
  // getUnreadNotifications
  // =========================================================================
  describe('getUnreadNotifications', () => {
    it('should query unread notifications with default limit', async () => {
      const mockNotifications = [{ id: 'n1' }, { id: 'n2' }];
      mockPrisma.workflowNotification.findMany.mockResolvedValue(mockNotifications);

      const result = await service.getUnreadNotifications('user-1');

      expect(result).toEqual(mockNotifications);
      expect(mockPrisma.workflowNotification.findMany).toHaveBeenCalledWith({
        where: { recipientId: 'user-1', readAt: null },
        include: {
          instance: {
            include: { workflow: { select: { name: true, code: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    });

    it('should use custom limit', async () => {
      mockPrisma.workflowNotification.findMany.mockResolvedValue([]);

      await service.getUnreadNotifications('user-1', 5);

      const call = mockPrisma.workflowNotification.findMany.mock.calls[0][0];
      expect(call.take).toBe(5);
    });
  });

  // =========================================================================
  // getNotifications
  // =========================================================================
  describe('getNotifications', () => {
    it('should return paginated notifications', async () => {
      const mockData = [{ id: 'n1' }];
      mockPrisma.workflowNotification.findMany.mockResolvedValue(mockData);
      mockPrisma.workflowNotification.count.mockResolvedValue(50);

      const result = await service.getNotifications('user-1', {
        page: 2,
        limit: 10,
      });

      expect(result.notifications).toEqual(mockData);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 50,
        totalPages: 5,
      });

      const findCall = mockPrisma.workflowNotification.findMany.mock.calls[0][0];
      expect(findCall.skip).toBe(10); // (2-1) * 10
      expect(findCall.take).toBe(10);
    });

    it('should use default pagination options', async () => {
      mockPrisma.workflowNotification.findMany.mockResolvedValue([]);
      mockPrisma.workflowNotification.count.mockResolvedValue(0);

      const result = await service.getNotifications('user-1');

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should filter unread only when specified', async () => {
      mockPrisma.workflowNotification.findMany.mockResolvedValue([]);
      mockPrisma.workflowNotification.count.mockResolvedValue(0);

      await service.getNotifications('user-1', { unreadOnly: true });

      const findCall = mockPrisma.workflowNotification.findMany.mock.calls[0][0];
      expect(findCall.where.readAt).toBeNull();
    });

    it('should not filter by readAt when unreadOnly is false', async () => {
      mockPrisma.workflowNotification.findMany.mockResolvedValue([]);
      mockPrisma.workflowNotification.count.mockResolvedValue(0);

      await service.getNotifications('user-1', { unreadOnly: false });

      const findCall = mockPrisma.workflowNotification.findMany.mock.calls[0][0];
      expect(findCall.where).toEqual({ recipientId: 'user-1' });
    });
  });

  // =========================================================================
  // getUnreadCount
  // =========================================================================
  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      mockPrisma.workflowNotification.count.mockResolvedValue(7);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(7);
      expect(mockPrisma.workflowNotification.count).toHaveBeenCalledWith({
        where: { recipientId: 'user-1', readAt: null },
      });
    });
  });

  // =========================================================================
  // sendOverdueReminders
  // =========================================================================
  describe('sendOverdueReminders', () => {
    it('should send reminders for overdue approvals', async () => {
      mockPrisma.workflowApproval.findMany.mockResolvedValue([
        {
          id: 'apr-1',
          instanceId: 'inst-1',
          approverId: 'user-1',
          instance: { workflow: { name: 'PO Approval' } },
          approver: { name: 'Alice' },
          step: { name: 'Manager Review' },
        },
        {
          id: 'apr-2',
          instanceId: 'inst-2',
          approverId: 'user-2',
          instance: { workflow: { name: 'SO Approval' } },
          approver: { name: 'Bob' },
          step: { name: 'Director Review' },
        },
      ]);
      mockPrisma.workflowNotification.create.mockResolvedValue({ id: 'n1' });
      mockPrisma.workflowApproval.update.mockResolvedValue({});

      const result = await service.sendOverdueReminders();

      expect(result.sent).toBe(2);
      expect(result.errors).toBe(0);
      expect(mockPrisma.workflowApproval.update).toHaveBeenCalledTimes(2);

      // Verify reminder count increment
      const updateCall = mockPrisma.workflowApproval.update.mock.calls[0][0];
      expect(updateCall.data.reminderCount).toEqual({ increment: 1 });
      expect(updateCall.data.lastReminderAt).toBeInstanceOf(Date);
    });

    it('should count errors when individual reminders fail', async () => {
      mockPrisma.workflowApproval.findMany.mockResolvedValue([
        {
          id: 'apr-1',
          instanceId: 'inst-1',
          approverId: 'user-1',
          instance: { workflow: { name: 'WF' } },
          approver: { name: 'Alice' },
          step: { name: 'Step' },
        },
      ]);
      // sendNotification succeeds but workflowApproval.update throws,
      // triggering the inner catch in sendOverdueReminders
      mockPrisma.workflowNotification.create.mockResolvedValue({ id: 'n1' });
      mockPrisma.workflowApproval.update.mockRejectedValue(new Error('update fail'));

      const result = await service.sendOverdueReminders();

      expect(result.sent).toBe(0);
      expect(result.errors).toBe(1);
    });

    it('should return zeros when no overdue approvals', async () => {
      mockPrisma.workflowApproval.findMany.mockResolvedValue([]);

      const result = await service.sendOverdueReminders();

      expect(result.sent).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('should handle top-level error gracefully', async () => {
      mockPrisma.workflowApproval.findMany.mockRejectedValue(new Error('DB error'));

      const result = await service.sendOverdueReminders();

      expect(result.sent).toBe(0);
      expect(result.errors).toBe(0);
    });
  });

  // =========================================================================
  // cleanupOldNotifications
  // =========================================================================
  describe('cleanupOldNotifications', () => {
    it('should delete read notifications older than specified days', async () => {
      mockPrisma.workflowNotification.deleteMany.mockResolvedValue({ count: 10 });

      const result = await service.cleanupOldNotifications(60);

      expect(result).toBe(10);
      expect(mockPrisma.workflowNotification.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) },
          readAt: { not: null },
        },
      });
    });

    it('should default to 90 days', async () => {
      mockPrisma.workflowNotification.deleteMany.mockResolvedValue({ count: 0 });

      await service.cleanupOldNotifications();

      expect(mockPrisma.workflowNotification.deleteMany).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Singleton
  // =========================================================================
  describe('notificationService singleton', () => {
    it('should be an instance of NotificationService', () => {
      expect(notificationService).toBeInstanceOf(NotificationService);
    });
  });
});
