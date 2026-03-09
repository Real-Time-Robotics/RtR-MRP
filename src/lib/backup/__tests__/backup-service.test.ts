import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.hoisted(() => {
  process.env.DATABASE_URL = 'file:./dev.db';
});

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    backup: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    backupSchedule: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: { count: vi.fn().mockResolvedValue(10), findMany: vi.fn().mockResolvedValue([]) },
    part: { count: vi.fn().mockResolvedValue(20), findMany: vi.fn().mockResolvedValue([]) },
    supplier: { count: vi.fn().mockResolvedValue(5), findMany: vi.fn().mockResolvedValue([]) },
    purchaseOrder: { count: vi.fn().mockResolvedValue(15), findMany: vi.fn().mockResolvedValue([]) },
    workOrder: { count: vi.fn().mockResolvedValue(8), findMany: vi.fn().mockResolvedValue([]) },
    product: { count: vi.fn().mockResolvedValue(12), findMany: vi.fn().mockResolvedValue([]) },
    notification: { count: vi.fn().mockResolvedValue(100), findMany: vi.fn().mockResolvedValue([]) },
  },
}));

const { mockExecAsync, mockFsExistsSync, mockFsMkdirSync, mockFsStatSync, mockFsWriteFileSync, mockFsReadFileSync, mockFsUnlinkSync } = vi.hoisted(() => ({
  mockExecAsync: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
  mockFsExistsSync: vi.fn().mockReturnValue(true),
  mockFsMkdirSync: vi.fn(),
  mockFsStatSync: vi.fn().mockReturnValue({ size: 1024 }),
  mockFsWriteFileSync: vi.fn(),
  mockFsReadFileSync: vi.fn().mockReturnValue(Buffer.from('test')),
  mockFsUnlinkSync: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));
vi.mock('child_process', () => {
  const execFn = vi.fn();
  return { default: { exec: execFn }, exec: execFn };
});
vi.mock('util', () => {
  const promisifyFn = () => mockExecAsync;
  return { default: { promisify: promisifyFn }, promisify: promisifyFn };
});
vi.mock('fs', () => ({
  default: {
    existsSync: mockFsExistsSync,
    mkdirSync: mockFsMkdirSync,
    statSync: mockFsStatSync,
    writeFileSync: mockFsWriteFileSync,
    readFileSync: mockFsReadFileSync,
    unlinkSync: mockFsUnlinkSync,
  },
  existsSync: mockFsExistsSync,
  mkdirSync: mockFsMkdirSync,
  statSync: mockFsStatSync,
  writeFileSync: mockFsWriteFileSync,
  readFileSync: mockFsReadFileSync,
  unlinkSync: mockFsUnlinkSync,
}));

import {
  createBackup,
  listBackups,
  getBackup,
  cleanupOldBackups,
  getBackupSchedule,
  updateBackupSchedule,
  getBackupFile,
} from '../backup-service';

describe('backup-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFsExistsSync.mockReturnValue(true);
    mockFsStatSync.mockReturnValue({ size: 1024 });
  });

  describe('createBackup', () => {
    it('should create a backup record and return success', async () => {
      mockPrisma.backup.create.mockResolvedValue({ id: 'b-1' });
      mockPrisma.backup.update.mockResolvedValue({});

      const result = await createBackup({
        type: 'MANUAL',
        userId: 'u-1',
      });

      expect(result.success).toBe(true);
      expect(result.backupId).toBe('b-1');
      expect(result.fileSize).toBe(1024);
    });

    it('should use custom name when provided', async () => {
      mockPrisma.backup.create.mockResolvedValue({ id: 'b-2' });
      mockPrisma.backup.update.mockResolvedValue({});

      const result = await createBackup({
        type: 'MANUAL',
        name: 'my-backup',
        userId: 'u-1',
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.backup.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'my-backup' }),
        })
      );
    });

    it('should return error result on failure', async () => {
      mockPrisma.backup.create.mockRejectedValue(new Error('DB error'));

      const result = await createBackup({ type: 'AUTO', userId: 'u-1' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });

    it('should fallback to JSON backup when exec fails', async () => {
      mockPrisma.backup.create.mockResolvedValue({ id: 'b-3' });
      mockPrisma.backup.update.mockResolvedValue({});
      mockExecAsync.mockRejectedValueOnce(new Error('sqlite3 not found'));

      const result = await createBackup({ type: 'MANUAL', userId: 'u-1' });

      expect(result.success).toBe(true);
    });
  });

  describe('listBackups', () => {
    it('should list backups with default limit', async () => {
      const backups = [{ id: 'b-1' }, { id: 'b-2' }];
      mockPrisma.backup.findMany.mockResolvedValue(backups);

      const result = await listBackups();

      expect(result).toEqual(backups);
      expect(mockPrisma.backup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      );
    });

    it('should filter by type', async () => {
      mockPrisma.backup.findMany.mockResolvedValue([]);

      await listBackups({ type: 'AUTO', limit: 10 });

      expect(mockPrisma.backup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'AUTO' },
          take: 10,
        })
      );
    });
  });

  describe('getBackup', () => {
    it('should return a backup by ID', async () => {
      const backup = { id: 'b-1', name: 'test' };
      mockPrisma.backup.findUnique.mockResolvedValue(backup);

      const result = await getBackup('b-1');

      expect(result).toEqual(backup);
    });
  });

  describe('cleanupOldBackups', () => {
    it('should delete old AUTO backups and their files', async () => {
      const oldBackups = [
        { id: 'b-old-1', filePath: '/backups/old1.sql' },
        { id: 'b-old-2', filePath: '/backups/old2.json' },
      ];
      mockPrisma.backup.findMany.mockResolvedValue(oldBackups);
      mockPrisma.backup.delete.mockResolvedValue({});

      const count = await cleanupOldBackups();

      expect(count).toBe(2);
      expect(mockFsUnlinkSync).toHaveBeenCalledTimes(2);
    });

    it('should handle missing files gracefully', async () => {
      mockPrisma.backup.findMany.mockResolvedValue([
        { id: 'b-old-1', filePath: '/backups/missing.sql' },
      ]);
      mockFsExistsSync.mockReturnValue(false);
      mockPrisma.backup.delete.mockResolvedValue({});

      const count = await cleanupOldBackups();

      expect(count).toBe(1);
      expect(mockFsUnlinkSync).not.toHaveBeenCalled();
    });

    it('should return 0 when no old backups', async () => {
      mockPrisma.backup.findMany.mockResolvedValue([]);

      const count = await cleanupOldBackups();

      expect(count).toBe(0);
    });
  });

  describe('getBackupSchedule', () => {
    it('should return existing schedule', async () => {
      const schedule = { id: 's-1', enabled: true, frequency: 'DAILY' };
      mockPrisma.backupSchedule.findFirst.mockResolvedValue(schedule);

      const result = await getBackupSchedule();

      expect(result).toEqual(schedule);
    });

    it('should create default schedule if none exists', async () => {
      mockPrisma.backupSchedule.findFirst.mockResolvedValue(null);
      const defaultSchedule = { id: 's-new', enabled: true, frequency: 'DAILY' };
      mockPrisma.backupSchedule.create.mockResolvedValue(defaultSchedule);

      const result = await getBackupSchedule();

      expect(result).toEqual(defaultSchedule);
    });
  });

  describe('updateBackupSchedule', () => {
    it('should update existing schedule', async () => {
      mockPrisma.backupSchedule.findFirst.mockResolvedValue({ id: 's-1' });
      mockPrisma.backupSchedule.update.mockResolvedValue({ id: 's-1', frequency: 'WEEKLY' });

      const result = await updateBackupSchedule({ frequency: 'WEEKLY' }, 'u-1');

      expect(result.frequency).toBe('WEEKLY');
    });

    it('should create schedule if none exists', async () => {
      mockPrisma.backupSchedule.findFirst.mockResolvedValue(null);
      mockPrisma.backupSchedule.create.mockResolvedValue({ id: 's-new' });

      await updateBackupSchedule({ enabled: false }, 'u-1');

      expect(mockPrisma.backupSchedule.create).toHaveBeenCalled();
    });
  });

  describe('getBackupFile', () => {
    it('should return buffer for existing backup', async () => {
      mockPrisma.backup.findUnique.mockResolvedValue({ id: 'b-1', filePath: '/backups/test.sql' });
      mockFsExistsSync.mockReturnValue(true);
      mockFsReadFileSync.mockReturnValue(Buffer.from('SQL content'));

      const result = await getBackupFile('b-1');

      expect(result).not.toBeNull();
      expect(result!.fileName).toBe('test.sql');
      expect(result!.mimeType).toBe('application/sql');
    });

    it('should return json mime type for json files', async () => {
      mockPrisma.backup.findUnique.mockResolvedValue({ id: 'b-2', filePath: '/backups/test.json' });
      mockFsExistsSync.mockReturnValue(true);
      mockFsReadFileSync.mockReturnValue(Buffer.from('{}'));

      const result = await getBackupFile('b-2');

      expect(result!.mimeType).toBe('application/json');
    });

    it('should return null if backup not found', async () => {
      mockPrisma.backup.findUnique.mockResolvedValue(null);

      const result = await getBackupFile('b-missing');

      expect(result).toBeNull();
    });

    it('should return null if file does not exist', async () => {
      mockPrisma.backup.findUnique.mockResolvedValue({ id: 'b-3', filePath: '/backups/gone.sql' });
      mockFsExistsSync.mockReturnValue(false);

      const result = await getBackupFile('b-3');

      expect(result).toBeNull();
    });

    it('should return null if no filePath', async () => {
      mockPrisma.backup.findUnique.mockResolvedValue({ id: 'b-4', filePath: null });

      const result = await getBackupFile('b-4');

      expect(result).toBeNull();
    });
  });
});
