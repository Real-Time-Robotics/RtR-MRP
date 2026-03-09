import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockSend, mockGetSignedUrl } = vi.hoisted(() => {
  const mockSend = vi.fn();
  const mockGetSignedUrl = vi.fn().mockResolvedValue('https://signed-url.example.com');
  return { mockSend, mockGetSignedUrl };
});

vi.mock('@aws-sdk/client-s3', () => {
  class MockS3Client {
    send = mockSend;
  }
  return {
    S3Client: MockS3Client,
    PutObjectCommand: class { input: unknown; constructor(input: unknown) { this.input = input; } },
    GetObjectCommand: class { input: unknown; constructor(input: unknown) { this.input = input; } },
    DeleteObjectCommand: class { input: unknown; constructor(input: unknown) { this.input = input; } },
    DeleteObjectsCommand: class { input: unknown; constructor(input: unknown) { this.input = input; } },
    ListObjectsV2Command: class { input: unknown; constructor(input: unknown) { this.input = input; } },
    HeadObjectCommand: class { input: unknown; constructor(input: unknown) { this.input = input; } },
    CopyObjectCommand: class { input: unknown; constructor(input: unknown) { this.input = input; } },
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

// ---------------------------------------------------------------------------
// Import module under test
// ---------------------------------------------------------------------------
import {
  storagePaths,
  uploadFile,
  uploadTenantFile,
  getUploadUrl,
  getDownloadUrl,
  downloadFile,
  downloadFileAsBuffer,
  getFileInfo,
  listFiles,
  listTenantFiles,
  deleteFile,
  deleteFiles,
  deleteByPrefix,
  deleteTenantFiles,
  copyFile,
  moveFile,
  getTenantStorageUsage,
  getTenantStorageBreakdown,
} from '../s3';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createReadable(chunks: Buffer[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        yield chunk;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  mockSend.mockReset();
  mockGetSignedUrl.mockReset();
  mockGetSignedUrl.mockResolvedValue('https://signed-url.example.com');
  mockSend.mockResolvedValue({});
});

describe('storagePaths', () => {
  it('generates documents path', () => {
    expect(storagePaths.documents('t1', 'file.pdf')).toBe('tenants/t1/documents/file.pdf');
  });

  it('generates reports path', () => {
    expect(storagePaths.reports('t1', 'monthly', 'r.csv')).toBe('tenants/t1/reports/monthly/r.csv');
  });

  it('generates exports path', () => {
    expect(storagePaths.exports('t1', 'data', 'e.csv')).toBe('tenants/t1/exports/data/e.csv');
  });

  it('generates imports path', () => {
    expect(storagePaths.imports('t1', 'i.csv')).toBe('tenants/t1/imports/i.csv');
  });

  it('generates attachments path', () => {
    expect(storagePaths.attachments('t1', 'order', 'o1', 'a.pdf')).toBe(
      'tenants/t1/attachments/order/o1/a.pdf'
    );
  });

  it('generates uploads path', () => {
    expect(storagePaths.uploads('t1', 'u1', 'f.png')).toBe('tenants/t1/uploads/u1/f.png');
  });

  it('generates backups path', () => {
    expect(storagePaths.backups('t1', 'daily', 'b.sql')).toBe('tenants/t1/backups/daily/b.sql');
  });

  it('generates branding path', () => {
    expect(storagePaths.branding('t1', 'logo.png')).toBe('tenants/t1/branding/logo.png');
  });
});

// ---------------------------------------------------------------------------
describe('uploadFile', () => {
  it('sends PutObjectCommand and returns the key', async () => {
    const key = await uploadFile('key1', Buffer.from('data'), 'text/plain', { tenantId: 't1' });
    expect(key).toBe('key1');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('passes metadata to PutObjectCommand', async () => {
    await uploadFile('k', 'body', 'text/plain', { tenantId: 't1', uploadedBy: 'u1' });
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd.input.Metadata).toEqual({ tenantId: 't1', uploadedBy: 'u1' });
  });
});

// ---------------------------------------------------------------------------
describe('uploadTenantFile', () => {
  it('uploads a document and returns key + url', async () => {
    const result = await uploadTenantFile('t1', 'documents', 'file.pdf', 'body', 'application/pdf');
    expect(result.key).toContain('tenants/t1/documents/');
    expect(result.key).toContain('file.pdf');
    expect(result.url).toBe('https://signed-url.example.com');
  });

  it('uploads a report', async () => {
    const result = await uploadTenantFile('t1', 'reports', 'r.csv', 'data', 'text/csv');
    expect(result.key).toContain('tenants/t1/reports/general/');
  });

  it('uploads an export', async () => {
    const result = await uploadTenantFile('t1', 'exports', 'e.csv', 'data', 'text/csv');
    expect(result.key).toContain('tenants/t1/exports/data/');
  });

  it('uploads an import', async () => {
    const result = await uploadTenantFile('t1', 'imports', 'i.csv', 'data', 'text/csv');
    expect(result.key).toContain('tenants/t1/imports/');
  });

  it('uploads an attachment with resourceType and resourceId', async () => {
    const result = await uploadTenantFile('t1', 'attachments', 'a.pdf', 'data', 'application/pdf', {
      resourceType: 'order',
      resourceId: 'o1',
    });
    expect(result.key).toContain('tenants/t1/attachments/order/o1/');
  });

  it('throws when attachments missing resourceType/resourceId', async () => {
    await expect(
      uploadTenantFile('t1', 'attachments', 'a.pdf', 'data', 'application/pdf')
    ).rejects.toThrow('resourceType and resourceId required for attachments');
  });
});

// ---------------------------------------------------------------------------
describe('getUploadUrl', () => {
  it('returns uploadUrl and key', async () => {
    mockGetSignedUrl.mockResolvedValue('https://upload-url.example.com');
    const result = await getUploadUrl('t1', 'file.txt', 'text/plain');
    expect(result.uploadUrl).toBe('https://upload-url.example.com');
    expect(result.key).toContain('tenants/t1/uploads/');
    expect(result.key).toContain('file.txt');
  });

  it('uses default expiresIn of 3600', async () => {
    await getUploadUrl('t1', 'f.txt', 'text/plain');
    expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), { expiresIn: 3600 });
  });

  it('uses custom expiresIn', async () => {
    await getUploadUrl('t1', 'f.txt', 'text/plain', 7200);
    expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), { expiresIn: 7200 });
  });
});

// ---------------------------------------------------------------------------
describe('getDownloadUrl', () => {
  it('returns signed url', async () => {
    mockGetSignedUrl.mockResolvedValue('https://download-url.example.com');
    const url = await getDownloadUrl('key1');
    expect(url).toBe('https://download-url.example.com');
  });

  it('passes downloadFilename as content disposition', async () => {
    await getDownloadUrl('key1', 3600, 'report.csv');
    const cmd = mockGetSignedUrl.mock.calls[0][1];
    expect(cmd.input.ResponseContentDisposition).toBe('attachment; filename="report.csv"');
  });

  it('omits disposition when no downloadFilename', async () => {
    await getDownloadUrl('key1');
    const cmd = mockGetSignedUrl.mock.calls[0][1];
    expect(cmd.input.ResponseContentDisposition).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
describe('downloadFile', () => {
  it('returns body, contentType and contentLength', async () => {
    const fakeBody = createReadable([Buffer.from('hello')]);
    mockSend.mockResolvedValue({
      Body: fakeBody,
      ContentType: 'text/plain',
      ContentLength: 5,
    });

    const result = await downloadFile('key1');
    expect(result.body).toBe(fakeBody);
    expect(result.contentType).toBe('text/plain');
    expect(result.contentLength).toBe(5);
  });
});

// ---------------------------------------------------------------------------
describe('downloadFileAsBuffer', () => {
  it('concatenates stream chunks into a buffer', async () => {
    const chunks = [Buffer.from('hel'), Buffer.from('lo')];
    mockSend.mockResolvedValue({
      Body: createReadable(chunks),
      ContentType: 'text/plain',
      ContentLength: 5,
    });

    const buf = await downloadFileAsBuffer('key1');
    expect(buf.toString()).toBe('hello');
  });
});

// ---------------------------------------------------------------------------
describe('getFileInfo', () => {
  it('returns file info on success', async () => {
    const now = new Date();
    mockSend.mockResolvedValue({
      ContentLength: 1024,
      LastModified: now,
      ContentType: 'application/pdf',
      Metadata: { tenantId: 't1' },
    });

    const info = await getFileInfo('key1');
    expect(info).toEqual({
      key: 'key1',
      size: 1024,
      lastModified: now,
      contentType: 'application/pdf',
      metadata: { tenantId: 't1' },
    });
  });

  it('returns null for NotFound', async () => {
    const error = new Error('NotFound');
    error.name = 'NotFound';
    mockSend.mockRejectedValue(error);

    const info = await getFileInfo('missing');
    expect(info).toBeNull();
  });

  it('throws non-NotFound errors', async () => {
    mockSend.mockRejectedValue(new Error('InternalServerError'));
    await expect(getFileInfo('key')).rejects.toThrow('InternalServerError');
  });

  it('defaults size to 0 and lastModified to a Date when missing', async () => {
    mockSend.mockResolvedValue({
      ContentLength: undefined,
      LastModified: undefined,
      ContentType: undefined,
      Metadata: undefined,
    });

    const info = await getFileInfo('key1');
    expect(info!.size).toBe(0);
    expect(info!.lastModified).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
describe('listFiles', () => {
  it('returns mapped file list', async () => {
    const now = new Date();
    mockSend.mockResolvedValue({
      Contents: [
        { Key: 'a.txt', Size: 100, LastModified: now },
        { Key: 'b.txt', Size: 200, LastModified: now },
      ],
    });

    const files = await listFiles('prefix/');
    expect(files).toHaveLength(2);
    expect(files[0]).toEqual({ key: 'a.txt', size: 100, lastModified: now });
  });

  it('returns empty array when Contents is undefined', async () => {
    mockSend.mockResolvedValue({});
    const files = await listFiles('prefix/');
    expect(files).toEqual([]);
  });

  it('defaults Size to 0 and LastModified to a Date', async () => {
    mockSend.mockResolvedValue({
      Contents: [{ Key: 'x.txt' }],
    });
    const files = await listFiles('prefix/');
    expect(files[0].size).toBe(0);
    expect(files[0].lastModified).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
describe('listTenantFiles', () => {
  it('uses category prefix when provided', async () => {
    mockSend.mockResolvedValue({ Contents: [] });
    await listTenantFiles('t1', 'documents');
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd.input.Prefix).toBe('tenants/t1/documents/');
  });

  it('uses tenant-only prefix when no category', async () => {
    mockSend.mockResolvedValue({ Contents: [] });
    await listTenantFiles('t1');
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd.input.Prefix).toBe('tenants/t1/');
  });
});

// ---------------------------------------------------------------------------
describe('deleteFile', () => {
  it('sends DeleteObjectCommand', async () => {
    await deleteFile('key1');
    expect(mockSend).toHaveBeenCalledTimes(1);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd.input.Key).toBe('key1');
  });
});

// ---------------------------------------------------------------------------
describe('deleteFiles', () => {
  it('does nothing for empty array', async () => {
    await deleteFiles([]);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sends one batch for <= 1000 keys', async () => {
    const keys = Array.from({ length: 5 }, (_, i) => `key${i}`);
    await deleteFiles(keys);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('batches in groups of 1000', async () => {
    const keys = Array.from({ length: 2500 }, (_, i) => `key${i}`);
    await deleteFiles(keys);
    expect(mockSend).toHaveBeenCalledTimes(3); // 1000 + 1000 + 500
  });
});

// ---------------------------------------------------------------------------
describe('deleteByPrefix', () => {
  it('lists and deletes files, returns count', async () => {
    const now = new Date();
    // First call: listFiles
    mockSend.mockResolvedValueOnce({
      Contents: [
        { Key: 'a', Size: 10, LastModified: now },
        { Key: 'b', Size: 20, LastModified: now },
      ],
    });
    // Second call: deleteFiles
    mockSend.mockResolvedValueOnce({});

    const count = await deleteByPrefix('prefix/');
    expect(count).toBe(2);
  });

  it('returns 0 when no files found', async () => {
    mockSend.mockResolvedValue({ Contents: [] });
    const count = await deleteByPrefix('empty/');
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
describe('deleteTenantFiles', () => {
  it('delegates to deleteByPrefix with tenant prefix', async () => {
    mockSend.mockResolvedValue({ Contents: [] });
    const count = await deleteTenantFiles('t1');
    expect(count).toBe(0);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd.input.Prefix).toBe('tenants/t1/');
  });
});

// ---------------------------------------------------------------------------
describe('copyFile', () => {
  it('sends CopyObjectCommand', async () => {
    await copyFile('src-key', 'dst-key');
    expect(mockSend).toHaveBeenCalledTimes(1);
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd.input.Key).toBe('dst-key');
    expect(cmd.input.CopySource).toContain('src-key');
  });
});

// ---------------------------------------------------------------------------
describe('moveFile', () => {
  it('copies then deletes', async () => {
    await moveFile('src', 'dst');
    // copy + delete = 2 sends
    expect(mockSend).toHaveBeenCalledTimes(2);
    // First call is CopyObjectCommand
    expect(mockSend.mock.calls[0][0].input.CopySource).toContain('src');
    // Second call is DeleteObjectCommand
    expect(mockSend.mock.calls[1][0].input.Key).toBe('src');
  });
});

// ---------------------------------------------------------------------------
describe('getTenantStorageUsage', () => {
  it('returns total size and file count', async () => {
    const now = new Date();
    mockSend.mockResolvedValue({
      Contents: [
        { Key: 'a', Size: 100, LastModified: now },
        { Key: 'b', Size: 200, LastModified: now },
      ],
    });

    const usage = await getTenantStorageUsage('t1');
    expect(usage).toEqual({ totalSize: 300, fileCount: 2 });
  });

  it('returns zeros when no files', async () => {
    mockSend.mockResolvedValue({ Contents: [] });
    const usage = await getTenantStorageUsage('t1');
    expect(usage).toEqual({ totalSize: 0, fileCount: 0 });
  });
});

// ---------------------------------------------------------------------------
describe('getTenantStorageBreakdown', () => {
  it('returns breakdown for all categories', async () => {
    mockSend.mockResolvedValue({ Contents: [] });

    const breakdown = await getTenantStorageBreakdown('t1');
    const expectedCategories = [
      'documents', 'reports', 'exports', 'imports',
      'attachments', 'uploads', 'backups', 'branding',
    ];
    for (const cat of expectedCategories) {
      expect(breakdown[cat]).toEqual({ size: 0, count: 0 });
    }
  });

  it('sums sizes per category', async () => {
    const now = new Date();
    // 8 categories; return files only for the first call (documents)
    mockSend
      .mockResolvedValueOnce({
        Contents: [
          { Key: 'a', Size: 50, LastModified: now },
          { Key: 'b', Size: 150, LastModified: now },
        ],
      })
      .mockResolvedValue({ Contents: [] });

    const breakdown = await getTenantStorageBreakdown('t1');
    expect(breakdown.documents).toEqual({ size: 200, count: 2 });
    expect(breakdown.reports).toEqual({ size: 0, count: 0 });
  });
});
