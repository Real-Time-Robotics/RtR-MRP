/**
 * Finance, Import, and Export API Routes Tests
 * Tests for finance/gl/accounts, finance/gl/journals, finance/invoices/purchase,
 * finance/invoices/sales, finance/reports, import/history, import/mappings,
 * excel/export, excel/templates
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// =============================================================================
// MOCKS
// =============================================================================

const mockPrisma = {
  gLAccount: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  journalEntry: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  journalLine: {
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  purchaseInvoice: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  salesInvoice: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  partCostRollup: {
    findMany: vi.fn(),
  },
  exportJob: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  excelTemplate: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  part: { findMany: vi.fn() },
  supplier: { findMany: vi.fn() },
  product: { findMany: vi.fn() },
  customer: { findMany: vi.fn() },
  inventory: { findMany: vi.fn() },
  salesOrder: { findMany: vi.fn() },
  purchaseOrder: { findMany: vi.fn() },
  workOrder: { findMany: vi.fn() },
};

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
  checkHeavyEndpointLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), logError: vi.fn() },
}));

// Mock finance lib
vi.mock('@/lib/finance', () => ({
  getAccountBalance: vi.fn().mockResolvedValue({ balance: 10000, debit: 15000, credit: 5000 }),
  getTrialBalance: vi.fn().mockResolvedValue({ accounts: [], totalDebit: 0, totalCredit: 0 }),
  createJournalEntry: vi.fn().mockResolvedValue({ entryId: 'je-1', entryNumber: 'JE-001' }),
  postJournalEntry: vi.fn().mockResolvedValue(undefined),
  voidJournalEntry: vi.fn().mockResolvedValue(undefined),
  reverseJournalEntry: vi.fn().mockResolvedValue({ entryId: 'je-rev-1' }),
  createPurchaseInvoice: vi.fn().mockResolvedValue({ invoiceId: 'pi-1', invoiceNumber: 'PI-001' }),
  recordPurchasePayment: vi.fn().mockResolvedValue({ paymentId: 'pay-1' }),
  getAPAging: vi.fn().mockResolvedValue({ current: 5000, overdue30: 2000, overdue60: 1000, overdue90: 500, total: 8500 }),
  createSalesInvoice: vi.fn().mockResolvedValue({ invoiceId: 'si-1', invoiceNumber: 'SI-001' }),
  recordSalesPayment: vi.fn().mockResolvedValue({ paymentId: 'pay-2' }),
  getARAging: vi.fn().mockResolvedValue({ current: 8000, overdue30: 3000, overdue60: 1500, overdue90: 800, total: 13300 }),
  getVarianceSummary: vi.fn().mockResolvedValue({ variances: [] }),
}));

// Mock pagination lib
vi.mock('@/lib/pagination', () => ({
  parsePaginationParams: vi.fn().mockReturnValue({ page: 1, pageSize: 20, sortBy: null, sortOrder: 'asc' }),
  buildOffsetPaginationQuery: vi.fn().mockReturnValue({ skip: 0, take: 20 }),
  buildPaginatedResponse: vi.fn().mockImplementation((data: unknown[], total: number) => ({
    data,
    meta: { total, page: 1, pageSize: 20, totalPages: Math.ceil(total / 20) },
  })),
  paginatedSuccess: vi.fn().mockImplementation((responseData: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NextResponse } = require('next/server');
    return NextResponse.json({ success: true, ...responseData as object });
  }),
  paginatedError: vi.fn().mockImplementation((message: string, status: number) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NextResponse } = require('next/server');
    return NextResponse.json({ success: false, error: message }, { status });
  }),
}));

// Mock import lib
vi.mock('@/lib/import', () => ({
  getImportHistory: vi.fn().mockResolvedValue({
    sessions: [{ id: 'sess-1', status: 'completed', entityType: 'parts' }],
    pagination: { total: 1, page: 1, pageSize: 20 },
  }),
  getImportSession: vi.fn().mockResolvedValue({
    id: 'sess-1', status: 'completed', entityType: 'parts', importedBy: 'user1',
  }),
  getImportLogs: vi.fn().mockResolvedValue({
    logs: [{ id: 'log-1', level: 'info', message: 'Row 1 imported' }],
    pagination: { total: 1, page: 1, pageSize: 50 },
  }),
  saveImportMapping: vi.fn().mockResolvedValue({
    id: 'map-1', name: 'Parts Mapping', targetType: 'parts', mapping: { col1: 'partNumber' },
  }),
  getSavedMappings: vi.fn().mockResolvedValue([
    { id: 'map-1', name: 'Parts Mapping', targetType: 'parts' },
  ]),
  useSavedMapping: vi.fn().mockResolvedValue({ id: 'map-1', usageCount: 2 }),
  deleteSavedMapping: vi.fn().mockResolvedValue(undefined),
}));

// Mock excel lib
vi.mock('@/lib/excel', () => ({
  exportToExcelBuffer: vi.fn().mockReturnValue({ success: true, buffer: Buffer.from('test') }),
  exportToCSVBuffer: vi.fn().mockReturnValue({ success: true, buffer: Buffer.from('test') }),
  defaultColumnDefinitions: { parts: [{ header: 'Part Number', key: 'partNumber' }] },
  generateImportTemplate: vi.fn().mockReturnValue({ success: true, buffer: Buffer.from('template') }),
  getFieldDefinitions: vi.fn().mockReturnValue([
    { key: 'partNumber', label: 'Part Number', type: 'string', required: true },
  ]),
}));

// =============================================================================
// IMPORTS (after vi.mock to get mocked modules)
// =============================================================================

import { auth } from '@/lib/auth';

// =============================================================================
// HELPERS
// =============================================================================

const mockAdminSession = {
  user: { id: 'user1', email: 'test@test.com', role: 'admin', name: 'Test Admin' },
};

const mockOperatorSession = {
  user: { id: 'user2', email: 'user@test.com', role: 'operator', name: 'Test Operator' },
};

const defaultContext = { params: Promise.resolve({}) };

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

function createDeleteRequest(url: string): NextRequest {
  return new NextRequest(url, { method: 'DELETE' });
}

// =============================================================================
// FINANCE GL ACCOUNTS TESTS
// =============================================================================

describe('/api/finance/gl/accounts', () => {
  let GET: (...args: any[]) => Promise<Response>;
  let POST: (...args: any[]) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockAdminSession);
    const mod = await import('../finance/gl/accounts/route');
    GET = mod.GET;
    POST = mod.POST;
  });

  it('GET returns paginated GL accounts list', async () => {
    (mockPrisma.gLAccount.count as Mock).mockResolvedValue(2);
    (mockPrisma.gLAccount.findMany as Mock).mockResolvedValue([
      { id: 'acc-1', accountNumber: '1000', name: 'Cash' },
      { id: 'acc-2', accountNumber: '2000', name: 'Accounts Payable' },
    ]);

    const req = createGetRequest('http://localhost:3000/api/finance/gl/accounts');
    const res = await GET(req, defaultContext);

    expect(res.status).toBe(200);
  });

  it('GET returns 403 for unauthorized role', async () => {
    (auth as Mock).mockResolvedValue(mockOperatorSession);

    const req = createGetRequest('http://localhost:3000/api/finance/gl/accounts');
    const res = await GET(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe('Forbidden');
  });

  it('POST creates a new GL account', async () => {
    (mockPrisma.gLAccount.findUnique as Mock).mockResolvedValue(null);
    (mockPrisma.gLAccount.create as Mock).mockResolvedValue({ id: 'acc-new', accountNumber: '3000' });

    const req = createPostRequest('http://localhost:3000/api/finance/gl/accounts', {
      accountNumber: '3000', name: 'Revenue', accountType: 'REVENUE', accountCategory: 'Operating Revenue',
    });
    const res = await POST(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.accountId).toBe('acc-new');
  });

  it('POST returns 400 for duplicate account number', async () => {
    (mockPrisma.gLAccount.findUnique as Mock).mockResolvedValue({ id: 'acc-existing', accountNumber: '3000' });

    const req = createPostRequest('http://localhost:3000/api/finance/gl/accounts', {
      accountNumber: '3000', name: 'Revenue', accountType: 'REVENUE', accountCategory: 'Operating Revenue',
    });
    const res = await POST(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Account number already exists');
  });
});

// =============================================================================
// FINANCE GL JOURNALS TESTS
// =============================================================================

describe('/api/finance/gl/journals', () => {
  let GET: (...args: any[]) => Promise<Response>;
  let POST: (...args: any[]) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockAdminSession);
    const mod = await import('../finance/gl/journals/route');
    GET = mod.GET;
    POST = mod.POST;
  });

  it('GET returns journal entries list', async () => {
    (mockPrisma.journalEntry.findMany as Mock).mockResolvedValue([
      { id: 'je-1', entryNumber: 'JE-001', description: 'Test', lines: [] },
    ]);

    const req = createGetRequest('http://localhost:3000/api/finance/gl/journals');
    const res = await GET(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.journals).toBeDefined();
  });

  it('POST creates a journal entry', async () => {
    const req = createPostRequest('http://localhost:3000/api/finance/gl/journals', {
      entryDate: '2024-01-15', description: 'Test entry',
      lines: [{ accountId: 'acc-1', debitAmount: 1000, creditAmount: 0 }],
    });
    const res = await POST(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.entryId).toBe('je-1');
  });

  it('POST returns 400 for invalid journal data', async () => {
    const req = createPostRequest('http://localhost:3000/api/finance/gl/journals', {
      description: 'Missing entryDate', lines: [],
    });
    const res = await POST(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Validation failed');
  });
});

// =============================================================================
// FINANCE PURCHASE INVOICES TESTS
// =============================================================================

describe('/api/finance/invoices/purchase', () => {
  let GET: (...args: any[]) => Promise<Response>;
  let POST: (...args: any[]) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockAdminSession);
    const mod = await import('../finance/invoices/purchase/route');
    GET = mod.GET;
    POST = mod.POST;
  });

  it('GET returns purchase invoices list', async () => {
    (mockPrisma.purchaseInvoice.findMany as Mock).mockResolvedValue([
      { id: 'pi-1', invoiceNumber: 'PI-001', status: 'DRAFT' },
    ]);

    const req = createGetRequest('http://localhost:3000/api/finance/invoices/purchase');
    const res = await GET(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.invoices).toBeDefined();
  });

  it('GET returns AP aging', async () => {
    const req = createGetRequest('http://localhost:3000/api/finance/invoices/purchase?action=aging');
    const res = await GET(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.summary).toBeDefined();
    expect(json.summary.total).toBe(8500);
  });

  it('POST creates a purchase invoice', async () => {
    const req = createPostRequest('http://localhost:3000/api/finance/invoices/purchase', {
      supplierId: 'sup-1', invoiceDate: '2024-01-15', dueDate: '2024-02-15',
      lines: [{ quantity: 10, unitPrice: 100 }],
    });
    const res = await POST(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.invoiceId).toBe('pi-1');
  });
});

// =============================================================================
// FINANCE SALES INVOICES TESTS
// =============================================================================

describe('/api/finance/invoices/sales', () => {
  let GET: (...args: any[]) => Promise<Response>;
  let POST: (...args: any[]) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockAdminSession);
    const mod = await import('../finance/invoices/sales/route');
    GET = mod.GET;
    POST = mod.POST;
  });

  it('GET returns sales invoices list', async () => {
    (mockPrisma.salesInvoice.findMany as Mock).mockResolvedValue([
      { id: 'si-1', invoiceNumber: 'SI-001', status: 'DRAFT' },
    ]);

    const req = createGetRequest('http://localhost:3000/api/finance/invoices/sales');
    const res = await GET(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.invoices).toBeDefined();
  });

  it('GET returns AR aging', async () => {
    const req = createGetRequest('http://localhost:3000/api/finance/invoices/sales?action=aging');
    const res = await GET(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.summary).toBeDefined();
    expect(json.summary.total).toBe(13300);
  });

  it('POST returns 400 for invalid data', async () => {
    const req = createPostRequest('http://localhost:3000/api/finance/invoices/sales', {
      customerId: '',
    });
    const res = await POST(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });
});

// =============================================================================
// FINANCE REPORTS TESTS
// =============================================================================

describe('/api/finance/reports', () => {
  let GET: (...args: any[]) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockAdminSession);
    const mod = await import('../finance/reports/route');
    GET = mod.GET;
  });

  it('GET returns trial balance report', async () => {
    const req = createGetRequest('http://localhost:3000/api/finance/reports?report=trial-balance');
    const res = await GET(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.report).toBe('trial-balance');
    expect(json.data).toBeDefined();
  });

  it('GET returns 400 for invalid report type', async () => {
    const req = createGetRequest('http://localhost:3000/api/finance/reports?report=nonexistent');
    const res = await GET(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid report type');
  });
});

// =============================================================================
// IMPORT HISTORY TESTS
// =============================================================================

describe('/api/import/history', () => {
  let GET: (...args: any[]) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockAdminSession);
    const mod = await import('../import/history/route');
    GET = mod.GET;
  });

  it('GET returns import history', async () => {
    const req = createGetRequest('http://localhost:3000/api/import/history');
    const res = await GET(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.sessions).toBeDefined();
  });

  it('GET returns specific session details', async () => {
    const req = createGetRequest('http://localhost:3000/api/import/history?sessionId=sess-1');
    const res = await GET(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.id).toBe('sess-1');
  });

  it('GET returns 401 when unauthenticated', async () => {
    (auth as Mock).mockResolvedValue(null);

    const req = createGetRequest('http://localhost:3000/api/import/history');
    const res = await GET(req, defaultContext);

    expect(res.status).toBe(401);
  });
});

// =============================================================================
// IMPORT MAPPINGS TESTS
// =============================================================================

describe('/api/import/mappings', () => {
  let GET: (...args: any[]) => Promise<Response>;
  let POST: (...args: any[]) => Promise<Response>;
  let DELETE: (...args: any[]) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockAdminSession);
    const mod = await import('../import/mappings/route');
    GET = mod.GET;
    POST = mod.POST;
    DELETE = mod.DELETE;
  });

  it('GET returns saved mappings', async () => {
    const req = createGetRequest('http://localhost:3000/api/import/mappings');
    const res = await GET(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
  });

  it('POST creates a new mapping', async () => {
    const req = createPostRequest('http://localhost:3000/api/import/mappings', {
      name: 'Parts Mapping', targetType: 'parts', mapping: { col1: 'partNumber' },
    });
    const res = await POST(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.id).toBe('map-1');
  });

  it('POST returns 400 for invalid mapping input', async () => {
    const req = createPostRequest('http://localhost:3000/api/import/mappings', {
      name: '', targetType: '',
    });
    const res = await POST(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid input');
  });

  it('DELETE returns 400 when mapping ID is missing', async () => {
    const req = createDeleteRequest('http://localhost:3000/api/import/mappings');
    const res = await DELETE(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Mapping ID required');
  });
});

// =============================================================================
// EXCEL EXPORT TESTS
// =============================================================================

describe('/api/excel/export', () => {
  let GET: (...args: any[]) => Promise<Response>;
  let POST: (...args: any[]) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockAdminSession);
    const mod = await import('../excel/export/route');
    GET = mod.GET;
    POST = mod.POST;
  });

  it('GET returns export job history', async () => {
    (mockPrisma.exportJob.findMany as Mock).mockResolvedValue([
      { id: 'job-1', type: 'parts', status: 'completed', fileName: 'parts_export.xlsx' },
    ]);

    const req = createGetRequest('http://localhost:3000/api/excel/export');
    const res = await GET(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.jobs).toBeDefined();
  });

  it('GET returns 404 for non-existent job', async () => {
    (mockPrisma.exportJob.findUnique as Mock).mockResolvedValue(null);

    const req = createGetRequest('http://localhost:3000/api/excel/export?jobId=nonexistent');
    const res = await GET(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Export job not found');
  });

  it('POST returns 400 when no data to export', async () => {
    (mockPrisma.part.findMany as Mock).mockResolvedValue([]);

    const req = createPostRequest('http://localhost:3000/api/excel/export', {
      type: 'parts', format: 'xlsx',
    });
    const res = await POST(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('No data to export');
  });
});

// =============================================================================
// EXCEL TEMPLATES TESTS
// =============================================================================

describe('/api/excel/templates', () => {
  let GET: (...args: any[]) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockAdminSession);
    const mod = await import('../excel/templates/route');
    GET = mod.GET;
  });

  it('GET returns available templates list', async () => {
    (mockPrisma.excelTemplate.findMany as Mock).mockResolvedValue([]);

    const req = createGetRequest('http://localhost:3000/api/excel/templates');
    const res = await GET(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.templates).toBeDefined();
    expect(Array.isArray(json.templates)).toBe(true);
  });

  it('GET returns specific template info', async () => {
    (mockPrisma.excelTemplate.findFirst as Mock).mockResolvedValue({ type: 'parts', downloadCount: 5 });

    const req = createGetRequest('http://localhost:3000/api/excel/templates?type=parts');
    const res = await GET(req, defaultContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.type).toBe('parts');
    expect(json.fields).toBeDefined();
    expect(json.downloadCount).toBe(5);
  });

  it('GET returns 401 when unauthenticated', async () => {
    (auth as Mock).mockResolvedValue(null);

    const req = createGetRequest('http://localhost:3000/api/excel/templates');
    const res = await GET(req, defaultContext);

    expect(res.status).toBe(401);
  });
});
