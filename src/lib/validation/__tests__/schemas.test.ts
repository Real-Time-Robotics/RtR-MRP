import { describe, it, expect } from 'vitest';
import {
  PaginationSchema,
  SortSchema,
  SearchSchema,
  IdSchema,
  DateRangeSchema,
  PartFiltersSchema,
  PartQuerySchema,
  PartCreateSchema,
  PartUpdateSchema,
  SalesOrderFiltersSchema,
  SalesOrderQuerySchema,
  SalesOrderLineSchema,
  SalesOrderCreateSchema,
  SalesOrderUpdateSchema,
  WorkOrderFiltersSchema,
  WorkOrderQuerySchema,
  WorkOrderOperationSchema,
  WorkOrderCreateSchema,
  WorkOrderUpdateSchema,
  NCRFiltersSchema,
  NCRQuerySchema,
  NCRCreateSchema,
  NCRUpdateSchema,
  InventoryFiltersSchema,
  InventoryQuerySchema,
  InventoryActionSchema,
  BOMFiltersSchema,
  BOMQuerySchema,
  BOMLineCreateSchema,
  BOMLineUpdateSchema,
  AnalyticsQuerySchema,
  validateRequest,
  parseSearchParams,
  Schemas,
} from '../schemas';

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

describe('PaginationSchema', () => {
  it('parses valid pagination', () => {
    const result = PaginationSchema.parse({ page: 2, pageSize: 50 });
    expect(result).toEqual({ page: 2, pageSize: 50 });
  });

  it('applies defaults when empty', () => {
    const result = PaginationSchema.parse({});
    expect(result).toEqual({ page: 1, pageSize: 20 });
  });

  it('coerces string numbers', () => {
    const result = PaginationSchema.parse({ page: '3', pageSize: '10' });
    expect(result).toEqual({ page: 3, pageSize: 10 });
  });

  it('rejects page < 1', () => {
    const result = PaginationSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects pageSize > 100', () => {
    const result = PaginationSchema.safeParse({ pageSize: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer page', () => {
    const result = PaginationSchema.safeParse({ page: 1.5 });
    expect(result.success).toBe(false);
  });
});

describe('SortSchema', () => {
  it('parses valid sort', () => {
    const result = SortSchema.parse({ sortBy: 'name', sortOrder: 'desc' });
    expect(result).toEqual({ sortBy: 'name', sortOrder: 'desc' });
  });

  it('applies default sortOrder', () => {
    const result = SortSchema.parse({});
    expect(result.sortOrder).toBe('asc');
  });

  it('rejects invalid sortOrder', () => {
    const result = SortSchema.safeParse({ sortOrder: 'up' });
    expect(result.success).toBe(false);
  });

  it('rejects sortBy exceeding 50 chars', () => {
    const result = SortSchema.safeParse({ sortBy: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });
});

describe('SearchSchema', () => {
  it('parses valid search', () => {
    const result = SearchSchema.parse({ search: 'widget' });
    expect(result.search).toBe('widget');
  });

  it('allows empty object', () => {
    const result = SearchSchema.parse({});
    expect(result.search).toBeUndefined();
  });

  it('rejects search exceeding 200 chars', () => {
    const result = SearchSchema.safeParse({ search: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });
});

describe('IdSchema', () => {
  it('parses valid id', () => {
    const result = IdSchema.parse({ id: 'abc-123' });
    expect(result.id).toBe('abc-123');
  });

  it('rejects empty id', () => {
    const result = IdSchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects id exceeding 50 chars', () => {
    const result = IdSchema.safeParse({ id: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('rejects missing id', () => {
    const result = IdSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('DateRangeSchema', () => {
  it('parses valid date range', () => {
    const result = DateRangeSchema.parse({
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    });
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.endDate).toBeInstanceOf(Date);
  });

  it('allows empty dates', () => {
    const result = DateRangeSchema.parse({});
    expect(result.startDate).toBeUndefined();
    expect(result.endDate).toBeUndefined();
  });

  it('allows only startDate', () => {
    const result = DateRangeSchema.parse({ startDate: '2024-01-01' });
    expect(result.startDate).toBeInstanceOf(Date);
  });

  it('allows only endDate', () => {
    const result = DateRangeSchema.parse({ endDate: '2024-12-31' });
    expect(result.endDate).toBeInstanceOf(Date);
  });

  it('rejects startDate after endDate', () => {
    const result = DateRangeSchema.safeParse({
      startDate: '2024-12-31',
      endDate: '2024-01-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Start date must be before end date');
    }
  });

  it('allows equal dates', () => {
    const result = DateRangeSchema.parse({
      startDate: '2024-06-15',
      endDate: '2024-06-15',
    });
    expect(result.startDate).toEqual(result.endDate);
  });
});

// =============================================================================
// PARTS SCHEMAS
// =============================================================================

describe('PartFiltersSchema', () => {
  it('parses all valid filters', () => {
    const result = PartFiltersSchema.parse({
      category: 'Electronics',
      subCategory: 'Resistors',
      status: 'ACTIVE',
      type: 'BUY',
      itar: 'true',
      stockStatus: 'IN_STOCK',
      supplierId: 'sup-1',
    });
    expect(result.category).toBe('Electronics');
    expect(result.status).toBe('ACTIVE');
  });

  it('allows empty filters', () => {
    const result = PartFiltersSchema.parse({});
    expect(result).toEqual({});
  });

  it('rejects invalid status', () => {
    const result = PartFiltersSchema.safeParse({ status: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid type', () => {
    const result = PartFiltersSchema.safeParse({ type: 'RENT' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid stockStatus', () => {
    const result = PartFiltersSchema.safeParse({ stockStatus: 'PLENTY' });
    expect(result.success).toBe(false);
  });

  it('validates all status enum values', () => {
    for (const s of ['DEVELOPMENT', 'PROTOTYPE', 'ACTIVE', 'PHASE_OUT', 'OBSOLETE', 'EOL']) {
      expect(PartFiltersSchema.parse({ status: s }).status).toBe(s);
    }
  });

  it('validates all type enum values', () => {
    for (const t of ['MAKE', 'BUY', 'BOTH']) {
      expect(PartFiltersSchema.parse({ type: t }).type).toBe(t);
    }
  });

  it('validates all stockStatus enum values', () => {
    for (const s of ['IN_STOCK', 'LOW_STOCK', 'CRITICAL', 'OUT_OF_STOCK', 'OVERSTOCK']) {
      expect(PartFiltersSchema.parse({ stockStatus: s }).stockStatus).toBe(s);
    }
  });
});

describe('PartQuerySchema', () => {
  it('parses a complete query', () => {
    const result = PartQuerySchema.parse({
      page: 1,
      pageSize: 10,
      sortBy: 'name',
      sortOrder: 'asc',
      search: 'bolt',
      category: 'Hardware',
    });
    expect(result.page).toBe(1);
    expect(result.search).toBe('bolt');
    expect(result.category).toBe('Hardware');
  });

  it('applies defaults for merged schemas', () => {
    const result = PartQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.sortOrder).toBe('asc');
  });
});

describe('PartCreateSchema', () => {
  const validPart = {
    partNumber: 'RTR-001',
    name: 'Test Part',
    category: 'Electronics',
    unitCost: 10.5,
  };

  it('parses valid part with minimal fields', () => {
    const result = PartCreateSchema.parse(validPart);
    expect(result.partNumber).toBe('RTR-001');
    expect(result.name).toBe('Test Part');
    expect(result.unit).toBe('pcs');
    expect(result.ndaaCompliant).toBe(true);
    expect(result.itarControlled).toBe(false);
    expect(result.rohsCompliant).toBe(true);
    expect(result.reachCompliant).toBe(true);
    expect(result.lotControl).toBe(false);
    expect(result.serialControl).toBe(false);
    expect(result.inspectionRequired).toBe(true);
    expect(result.minStock).toBe(0);
    expect(result.reorderPoint).toBe(0);
    expect(result.safetyStock).toBe(0);
    expect(result.leadTimeDays).toBe(0);
    expect(result.critical).toBe(false);
    expect(result.makeOrBuy).toBe('BUY');
    expect(result.tags).toEqual([]);
  });

  it('parses all optional fields', () => {
    const result = PartCreateSchema.parse({
      ...validPart,
      description: 'A test part',
      subCategory: 'Sub',
      partType: 'Custom',
      unit: 'kg',
      countryOfOrigin: 'US',
      hsCode: '8501.10',
      eccn: 'EAR99',
      shelfLifeDays: 365,
      maxStock: 1000,
      standardCost: 9.0,
      manufacturer: 'Acme',
      manufacturerPn: 'ACM-001',
      drawingNumber: 'DWG-001',
      primarySupplierId: 'sup-1',
      notes: 'Some notes',
      tags: ['tag1', 'tag2'],
    });
    expect(result.description).toBe('A test part');
    expect(result.shelfLifeDays).toBe(365);
    expect(result.tags).toEqual(['tag1', 'tag2']);
  });

  it('rejects invalid partNumber format', () => {
    const result = PartCreateSchema.safeParse({ ...validPart, partNumber: 'has spaces' });
    expect(result.success).toBe(false);
  });

  it('rejects empty partNumber', () => {
    const result = PartCreateSchema.safeParse({ ...validPart, partNumber: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = PartCreateSchema.safeParse({ ...validPart, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing unitCost', () => {
    const result = PartCreateSchema.safeParse({ partNumber: 'X-1', name: 'X', category: 'Y' });
    expect(result.success).toBe(false);
  });

  it('rejects negative unitCost', () => {
    const result = PartCreateSchema.safeParse({ ...validPart, unitCost: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects negative minStock', () => {
    const result = PartCreateSchema.safeParse({ ...validPart, minStock: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects too many tags', () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    const result = PartCreateSchema.safeParse({ ...validPart, tags });
    expect(result.success).toBe(false);
  });

  it('rejects description exceeding 2000 chars', () => {
    const result = PartCreateSchema.safeParse({ ...validPart, description: 'a'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('validates makeOrBuy enum', () => {
    for (const v of ['MAKE', 'BUY', 'BOTH']) {
      const result = PartCreateSchema.parse({ ...validPart, makeOrBuy: v });
      expect(result.makeOrBuy).toBe(v);
    }
  });

  it('rejects non-integer shelfLifeDays', () => {
    const result = PartCreateSchema.safeParse({ ...validPart, shelfLifeDays: 1.5 });
    expect(result.success).toBe(false);
  });
});

describe('PartUpdateSchema', () => {
  it('requires id', () => {
    const result = PartUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('allows partial update with just id', () => {
    const result = PartUpdateSchema.parse({ id: 'part-1' });
    expect(result.id).toBe('part-1');
  });

  it('allows updating specific fields', () => {
    const result = PartUpdateSchema.parse({ id: 'part-1', name: 'Updated', unitCost: 20 });
    expect(result.name).toBe('Updated');
    expect(result.unitCost).toBe(20);
  });
});

// =============================================================================
// SALES ORDER SCHEMAS
// =============================================================================

describe('SalesOrderFiltersSchema', () => {
  it('parses all valid filters', () => {
    const result = SalesOrderFiltersSchema.parse({
      status: 'CONFIRMED',
      priority: 'high',
      customerId: 'cust-1',
      view: 'kanban',
    });
    expect(result.status).toBe('CONFIRMED');
    expect(result.view).toBe('kanban');
  });

  it('defaults view to list', () => {
    const result = SalesOrderFiltersSchema.parse({});
    expect(result.view).toBe('list');
  });

  it('rejects invalid status', () => {
    const result = SalesOrderFiltersSchema.safeParse({ status: 'UNKNOWN' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid priority', () => {
    const result = SalesOrderFiltersSchema.safeParse({ priority: 'medium' });
    expect(result.success).toBe(false);
  });

  it('validates all status values', () => {
    for (const s of ['DRAFT', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED']) {
      expect(SalesOrderFiltersSchema.parse({ status: s }).status).toBe(s);
    }
  });

  it('validates all priority values', () => {
    for (const p of ['low', 'normal', 'high', 'urgent']) {
      expect(SalesOrderFiltersSchema.parse({ priority: p }).priority).toBe(p);
    }
  });
});

describe('SalesOrderQuerySchema', () => {
  it('merges pagination, sort, search, filters, and date range', () => {
    const result = SalesOrderQuerySchema.parse({
      page: 2,
      sortBy: 'date',
      search: 'test',
      status: 'DRAFT',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    });
    expect(result.page).toBe(2);
    expect(result.status).toBe('DRAFT');
    expect(result.startDate).toBeInstanceOf(Date);
  });
});

describe('SalesOrderLineSchema', () => {
  it('parses valid line', () => {
    const result = SalesOrderLineSchema.parse({
      productId: 'prod-1',
      quantity: 5,
      unitPrice: 100,
    });
    expect(result.discountPercent).toBe(0);
  });

  it('rejects zero quantity', () => {
    const result = SalesOrderLineSchema.safeParse({
      productId: 'prod-1',
      quantity: 0,
      unitPrice: 100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative unitPrice', () => {
    const result = SalesOrderLineSchema.safeParse({
      productId: 'prod-1',
      quantity: 1,
      unitPrice: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects discount > 100', () => {
    const result = SalesOrderLineSchema.safeParse({
      productId: 'prod-1',
      quantity: 1,
      unitPrice: 10,
      discountPercent: 101,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing productId', () => {
    const result = SalesOrderLineSchema.safeParse({ quantity: 1, unitPrice: 10 });
    expect(result.success).toBe(false);
  });
});

describe('SalesOrderCreateSchema', () => {
  const validOrder = {
    customerId: 'cust-1',
    lines: [{ productId: 'prod-1', quantity: 1, unitPrice: 100 }],
  };

  it('parses valid order with defaults', () => {
    const result = SalesOrderCreateSchema.parse(validOrder);
    expect(result.priority).toBe('normal');
    expect(result.currency).toBe('USD');
    expect(result.lines).toHaveLength(1);
  });

  it('parses all optional fields', () => {
    const result = SalesOrderCreateSchema.parse({
      ...validOrder,
      orderDate: '2024-06-01',
      requestedDate: '2024-07-01',
      promisedDate: '2024-06-28',
      priority: 'urgent',
      currency: 'VND',
      paymentTerms: 'Net 30',
      shippingMethod: 'Express',
      shippingAddress: '123 Main St',
      notes: 'Rush order',
    });
    expect(result.priority).toBe('urgent');
    expect(result.currency).toBe('VND');
  });

  it('rejects empty lines array', () => {
    const result = SalesOrderCreateSchema.safeParse({ customerId: 'cust-1', lines: [] });
    expect(result.success).toBe(false);
  });

  it('rejects more than 100 lines', () => {
    const lines = Array.from({ length: 101 }, () => ({
      productId: 'p1',
      quantity: 1,
      unitPrice: 1,
    }));
    const result = SalesOrderCreateSchema.safeParse({ customerId: 'cust-1', lines });
    expect(result.success).toBe(false);
  });

  it('rejects missing customerId', () => {
    const result = SalesOrderCreateSchema.safeParse({ lines: validOrder.lines });
    expect(result.success).toBe(false);
  });

  it('rejects currency not 3 chars', () => {
    const result = SalesOrderCreateSchema.safeParse({ ...validOrder, currency: 'US' });
    expect(result.success).toBe(false);
  });

  it('rejects notes exceeding 5000 chars', () => {
    const result = SalesOrderCreateSchema.safeParse({ ...validOrder, notes: 'x'.repeat(5001) });
    expect(result.success).toBe(false);
  });
});

describe('SalesOrderUpdateSchema', () => {
  it('parses valid update', () => {
    const result = SalesOrderUpdateSchema.parse({
      id: 'so-1',
      status: 'CONFIRMED',
      priority: 'high',
    });
    expect(result.status).toBe('CONFIRMED');
  });

  it('requires id', () => {
    const result = SalesOrderUpdateSchema.safeParse({ status: 'CONFIRMED' });
    expect(result.success).toBe(false);
  });

  it('allows just id', () => {
    const result = SalesOrderUpdateSchema.parse({ id: 'so-1' });
    expect(result.id).toBe('so-1');
  });

  it('coerces date strings', () => {
    const result = SalesOrderUpdateSchema.parse({
      id: 'so-1',
      requestedDate: '2024-07-01',
      promisedDate: '2024-06-28',
    });
    expect(result.requestedDate).toBeInstanceOf(Date);
    expect(result.promisedDate).toBeInstanceOf(Date);
  });
});

// =============================================================================
// WORK ORDER SCHEMAS
// =============================================================================

describe('WorkOrderFiltersSchema', () => {
  it('parses all valid filters', () => {
    const result = WorkOrderFiltersSchema.parse({
      status: 'IN_PROGRESS',
      priority: 'urgent',
      workCenter: 'WC-A',
      productId: 'prod-1',
      view: 'kanban',
    });
    expect(result.status).toBe('IN_PROGRESS');
    expect(result.view).toBe('kanban');
  });

  it('defaults view to list', () => {
    const result = WorkOrderFiltersSchema.parse({});
    expect(result.view).toBe('list');
  });

  it('rejects invalid status', () => {
    const result = WorkOrderFiltersSchema.safeParse({ status: 'ACTIVE' });
    expect(result.success).toBe(false);
  });

  it('validates all status values', () => {
    for (const s of ['DRAFT', 'RELEASED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'CANCELLED']) {
      expect(WorkOrderFiltersSchema.parse({ status: s }).status).toBe(s);
    }
  });
});

describe('WorkOrderQuerySchema', () => {
  it('merges all schemas', () => {
    const result = WorkOrderQuerySchema.parse({
      page: 1,
      sortBy: 'dueDate',
      search: 'WO',
      status: 'RELEASED',
      startDate: '2024-01-01',
    });
    expect(result.status).toBe('RELEASED');
    expect(result.startDate).toBeInstanceOf(Date);
  });
});

describe('WorkOrderOperationSchema', () => {
  it('parses valid operation', () => {
    const result = WorkOrderOperationSchema.parse({
      seq: 1,
      name: 'Cutting',
      workCenter: 'WC-A',
      plannedHours: 2.5,
    });
    expect(result.seq).toBe(1);
    expect(result.plannedHours).toBe(2.5);
  });

  it('rejects seq < 1', () => {
    const result = WorkOrderOperationSchema.safeParse({
      seq: 0,
      name: 'Op',
      plannedHours: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = WorkOrderOperationSchema.safeParse({
      seq: 1,
      name: '',
      plannedHours: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative plannedHours', () => {
    const result = WorkOrderOperationSchema.safeParse({
      seq: 1,
      name: 'Op',
      plannedHours: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe('WorkOrderCreateSchema', () => {
  const validWO = {
    productId: 'prod-1',
    quantity: 10,
  };

  it('parses valid work order with defaults', () => {
    const result = WorkOrderCreateSchema.parse(validWO);
    expect(result.priority).toBe('normal');
    expect(result.productId).toBe('prod-1');
  });

  it('parses with operations', () => {
    const result = WorkOrderCreateSchema.parse({
      ...validWO,
      operations: [{ seq: 1, name: 'Cut', plannedHours: 2 }],
    });
    expect(result.operations).toHaveLength(1);
  });

  it('rejects quantity < 0.001', () => {
    const result = WorkOrderCreateSchema.safeParse({ ...validWO, quantity: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects missing productId', () => {
    const result = WorkOrderCreateSchema.safeParse({ quantity: 10 });
    expect(result.success).toBe(false);
  });

  it('parses with all optional fields', () => {
    const result = WorkOrderCreateSchema.parse({
      ...validWO,
      startDate: '2024-01-01',
      dueDate: '2024-02-01',
      priority: 'high',
      workCenter: 'WC-B',
      notes: 'Priority build',
    });
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.workCenter).toBe('WC-B');
  });
});

describe('WorkOrderUpdateSchema', () => {
  it('parses valid update', () => {
    const result = WorkOrderUpdateSchema.parse({
      id: 'wo-1',
      status: 'COMPLETED',
      completedQty: 100,
    });
    expect(result.status).toBe('COMPLETED');
    expect(result.completedQty).toBe(100);
  });

  it('requires id', () => {
    const result = WorkOrderUpdateSchema.safeParse({ status: 'COMPLETED' });
    expect(result.success).toBe(false);
  });

  it('preprocesses status to uppercase', () => {
    const result = WorkOrderUpdateSchema.parse({ id: 'wo-1', status: 'completed' });
    expect(result.status).toBe('COMPLETED');
  });

  it('preprocesses mixed case status', () => {
    const result = WorkOrderUpdateSchema.parse({ id: 'wo-1', status: 'In_Progress' });
    expect(result.status).toBe('IN_PROGRESS');
  });

  it('accepts nullable plannedStart and plannedEnd', () => {
    const result = WorkOrderUpdateSchema.parse({
      id: 'wo-1',
      plannedStart: null,
      plannedEnd: null,
    });
    expect(result.plannedStart).toBeNull();
    expect(result.plannedEnd).toBeNull();
  });

  it('accepts string plannedStart and plannedEnd', () => {
    const result = WorkOrderUpdateSchema.parse({
      id: 'wo-1',
      plannedStart: '2024-01-01',
      plannedEnd: '2024-02-01',
    });
    expect(result.plannedStart).toBe('2024-01-01');
  });

  it('accepts Date plannedStart', () => {
    const d = new Date('2024-01-01');
    const result = WorkOrderUpdateSchema.parse({ id: 'wo-1', plannedStart: d });
    expect(result.plannedStart).toEqual(d);
  });

  it('rejects negative scrapQty', () => {
    const result = WorkOrderUpdateSchema.safeParse({ id: 'wo-1', scrapQty: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects negative completedQty', () => {
    const result = WorkOrderUpdateSchema.safeParse({ id: 'wo-1', completedQty: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects quantity < 1', () => {
    const result = WorkOrderUpdateSchema.safeParse({ id: 'wo-1', quantity: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer quantity', () => {
    const result = WorkOrderUpdateSchema.safeParse({ id: 'wo-1', quantity: 1.5 });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// NCR SCHEMAS
// =============================================================================

describe('NCRFiltersSchema', () => {
  it('parses all valid filters', () => {
    const result = NCRFiltersSchema.parse({
      status: 'open',
      severity: 'critical',
      source: 'supplier',
      type: 'Receiving',
      view: 'kanban',
    });
    expect(result.status).toBe('open');
    expect(result.severity).toBe('critical');
  });

  it('defaults view to list', () => {
    const result = NCRFiltersSchema.parse({});
    expect(result.view).toBe('list');
  });

  it('rejects invalid severity', () => {
    const result = NCRFiltersSchema.safeParse({ severity: 'low' });
    expect(result.success).toBe(false);
  });

  it('validates all status values', () => {
    for (const s of ['open', 'in_progress', 'pending_review', 'closed']) {
      expect(NCRFiltersSchema.parse({ status: s }).status).toBe(s);
    }
  });

  it('validates all severity values', () => {
    for (const s of ['minor', 'major', 'critical']) {
      expect(NCRFiltersSchema.parse({ severity: s }).severity).toBe(s);
    }
  });

  it('validates all source values', () => {
    for (const s of ['supplier', 'production', 'customer']) {
      expect(NCRFiltersSchema.parse({ source: s }).source).toBe(s);
    }
  });

  it('validates all type values', () => {
    for (const t of ['Receiving', 'In-Process', 'Final', 'Customer']) {
      expect(NCRFiltersSchema.parse({ type: t }).type).toBe(t);
    }
  });
});

describe('NCRQuerySchema', () => {
  it('merges all schemas', () => {
    const result = NCRQuerySchema.parse({
      page: 1,
      search: 'NCR',
      status: 'open',
      startDate: '2024-01-01',
    });
    expect(result.status).toBe('open');
  });
});

describe('NCRCreateSchema', () => {
  const validNCR = {
    type: 'Receiving' as const,
    source: 'supplier' as const,
    quantityAffected: 10,
    description: 'Defective parts received',
  };

  it('parses valid NCR', () => {
    const result = NCRCreateSchema.parse(validNCR);
    expect(result.type).toBe('Receiving');
    expect(result.source).toBe('supplier');
  });

  it('parses all optional fields', () => {
    const result = NCRCreateSchema.parse({
      ...validNCR,
      partId: 'part-1',
      partNumber: 'PN-001',
      partName: 'Widget',
      rootCause: 'Supplier error',
      disposition: 'Rework',
      costImpact: 500,
      assignedTo: 'John',
    });
    expect(result.disposition).toBe('Rework');
    expect(result.costImpact).toBe(500);
  });

  it('rejects missing description', () => {
    const result = NCRCreateSchema.safeParse({
      type: 'Receiving',
      source: 'supplier',
      quantityAffected: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty description', () => {
    const result = NCRCreateSchema.safeParse({ ...validNCR, description: '' });
    expect(result.success).toBe(false);
  });

  it('rejects quantityAffected < 0.001', () => {
    const result = NCRCreateSchema.safeParse({ ...validNCR, quantityAffected: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative costImpact', () => {
    const result = NCRCreateSchema.safeParse({ ...validNCR, costImpact: -10 });
    expect(result.success).toBe(false);
  });

  it('validates all disposition values', () => {
    for (const d of ['Scrap', 'Rework', 'Return', 'Use-as-is']) {
      expect(NCRCreateSchema.parse({ ...validNCR, disposition: d }).disposition).toBe(d);
    }
  });

  it('rejects invalid disposition', () => {
    const result = NCRCreateSchema.safeParse({ ...validNCR, disposition: 'Destroy' });
    expect(result.success).toBe(false);
  });
});

describe('NCRUpdateSchema', () => {
  it('parses valid update', () => {
    const result = NCRUpdateSchema.parse({
      id: 'ncr-1',
      status: 'closed',
      rootCause: 'Material defect',
      disposition: 'Scrap',
      costImpact: 100,
      assignedTo: 'Jane',
    });
    expect(result.status).toBe('closed');
  });

  it('requires id', () => {
    const result = NCRUpdateSchema.safeParse({ status: 'closed' });
    expect(result.success).toBe(false);
  });

  it('allows just id', () => {
    const result = NCRUpdateSchema.parse({ id: 'ncr-1' });
    expect(result.id).toBe('ncr-1');
  });
});

// =============================================================================
// INVENTORY SCHEMAS
// =============================================================================

describe('InventoryFiltersSchema', () => {
  it('parses all valid filters', () => {
    const result = InventoryFiltersSchema.parse({
      warehouse: 'WH-1',
      category: 'Electronics',
      stockStatus: 'LOW_STOCK',
      partId: 'part-1',
    });
    expect(result.warehouse).toBe('WH-1');
    expect(result.stockStatus).toBe('LOW_STOCK');
  });

  it('allows empty filters', () => {
    const result = InventoryFiltersSchema.parse({});
    expect(result).toEqual({});
  });

  it('rejects invalid stockStatus', () => {
    const result = InventoryFiltersSchema.safeParse({ stockStatus: 'PLENTY' });
    expect(result.success).toBe(false);
  });
});

describe('InventoryQuerySchema', () => {
  it('merges pagination, sort, search, and filters', () => {
    const result = InventoryQuerySchema.parse({
      page: 1,
      warehouse: 'WH-1',
      search: 'bolt',
    });
    expect(result.page).toBe(1);
    expect(result.warehouse).toBe('WH-1');
  });
});

describe('InventoryActionSchema', () => {
  it('parses receive action', () => {
    const result = InventoryActionSchema.parse({
      action: 'receive',
      partId: 'part-1',
      warehouseId: 'wh-1',
      quantity: 100,
      lotNumber: 'LOT-001',
      serialNumber: 'SN-001',
      notes: 'Received from supplier',
    });
    expect(result.action).toBe('receive');
  });

  it('parses issue action', () => {
    const result = InventoryActionSchema.parse({
      action: 'issue',
      partId: 'part-1',
      warehouseId: 'wh-1',
      quantity: 50,
      lotNumber: 'LOT-001',
    });
    expect(result.action).toBe('issue');
  });

  it('parses reserve action', () => {
    const result = InventoryActionSchema.parse({
      action: 'reserve',
      partId: 'part-1',
      warehouseId: 'wh-1',
      quantity: 25,
    });
    expect(result.action).toBe('reserve');
  });

  it('parses transfer action', () => {
    const result = InventoryActionSchema.parse({
      action: 'transfer',
      partId: 'part-1',
      warehouseId: 'wh-1',
      toWarehouseId: 'wh-2',
      quantity: 10,
    });
    expect(result.action).toBe('transfer');
    if (result.action === 'transfer') {
      expect(result.toWarehouseId).toBe('wh-2');
    }
  });

  it('parses adjust action with zero quantity', () => {
    const result = InventoryActionSchema.parse({
      action: 'adjust',
      partId: 'part-1',
      warehouseId: 'wh-1',
      quantity: 0,
    });
    expect(result.action).toBe('adjust');
  });

  it('rejects unknown action', () => {
    const result = InventoryActionSchema.safeParse({
      action: 'destroy',
      partId: 'part-1',
      warehouseId: 'wh-1',
      quantity: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects receive with zero quantity', () => {
    const result = InventoryActionSchema.safeParse({
      action: 'receive',
      partId: 'part-1',
      warehouseId: 'wh-1',
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects issue with missing partId', () => {
    const result = InventoryActionSchema.safeParse({
      action: 'issue',
      warehouseId: 'wh-1',
      quantity: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects transfer with missing toWarehouseId', () => {
    const result = InventoryActionSchema.safeParse({
      action: 'transfer',
      partId: 'part-1',
      warehouseId: 'wh-1',
      quantity: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects receive with missing warehouseId', () => {
    const result = InventoryActionSchema.safeParse({
      action: 'receive',
      partId: 'part-1',
      quantity: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects adjust with negative quantity', () => {
    const result = InventoryActionSchema.safeParse({
      action: 'adjust',
      partId: 'part-1',
      warehouseId: 'wh-1',
      quantity: -1,
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// BOM SCHEMAS
// =============================================================================

describe('BOMFiltersSchema', () => {
  it('parses all valid filters', () => {
    const result = BOMFiltersSchema.parse({
      category: 'Assembly',
      bomType: 'MANUFACTURING',
      productId: 'prod-1',
      includeTree: 'true',
    });
    expect(result.bomType).toBe('MANUFACTURING');
    expect(result.includeTree).toBe('true');
  });

  it('defaults includeTree to false', () => {
    const result = BOMFiltersSchema.parse({});
    expect(result.includeTree).toBe('false');
  });

  it('rejects invalid bomType', () => {
    const result = BOMFiltersSchema.safeParse({ bomType: 'CUSTOM' });
    expect(result.success).toBe(false);
  });

  it('validates all bomType values', () => {
    for (const t of ['ENGINEERING', 'MANUFACTURING', 'CONFIGURABLE', 'PLANNING', 'SERVICE']) {
      expect(BOMFiltersSchema.parse({ bomType: t }).bomType).toBe(t);
    }
  });
});

describe('BOMQuerySchema', () => {
  it('merges all schemas', () => {
    const result = BOMQuerySchema.parse({
      page: 1,
      bomType: 'ENGINEERING',
      search: 'assy',
    });
    expect(result.bomType).toBe('ENGINEERING');
  });
});

describe('BOMLineCreateSchema', () => {
  const validLine = {
    productId: 'prod-1',
    partId: 'part-1',
    quantity: 2,
  };

  it('parses valid BOM line with defaults', () => {
    const result = BOMLineCreateSchema.parse(validLine);
    expect(result.unit).toBe('pcs');
    expect(result.critical).toBe(false);
    expect(result.scrapPercent).toBe(0);
    expect(result.revision).toBe('A');
    expect(result.isPrimary).toBe(true);
    expect(result.bomType).toBe('MANUFACTURING');
    expect(result.subAssembly).toBe(false);
    expect(result.phantom).toBe(false);
    expect(result.sequence).toBe(0);
  });

  it('parses all optional fields', () => {
    const result = BOMLineCreateSchema.parse({
      ...validLine,
      unit: 'kg',
      module: 'Power',
      critical: true,
      notes: 'Important',
      findNumber: 10,
      referenceDesignator: 'R1',
      scrapPercent: 5,
      operationSeq: 20,
      revision: 'B',
      effectivityDate: '2024-06-01',
      alternateGroup: 'ALT-1',
      isPrimary: false,
      bomType: 'ENGINEERING',
      subAssembly: true,
      phantom: true,
      sequence: 5,
      positionX: 1.5,
      positionY: 2.5,
      positionZ: 3.5,
    });
    expect(result.module).toBe('Power');
    expect(result.referenceDesignator).toBe('R1');
    expect(result.effectivityDate).toBeInstanceOf(Date);
    expect(result.positionX).toBe(1.5);
  });

  it('rejects missing productId', () => {
    const result = BOMLineCreateSchema.safeParse({ partId: 'p1', quantity: 1 });
    expect(result.success).toBe(false);
  });

  it('rejects missing partId', () => {
    const result = BOMLineCreateSchema.safeParse({ productId: 'p1', quantity: 1 });
    expect(result.success).toBe(false);
  });

  it('rejects quantity < 0.001', () => {
    const result = BOMLineCreateSchema.safeParse({ ...validLine, quantity: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects scrapPercent > 100', () => {
    const result = BOMLineCreateSchema.safeParse({ ...validLine, scrapPercent: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects negative scrapPercent', () => {
    const result = BOMLineCreateSchema.safeParse({ ...validLine, scrapPercent: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects negative findNumber', () => {
    const result = BOMLineCreateSchema.safeParse({ ...validLine, findNumber: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer findNumber', () => {
    const result = BOMLineCreateSchema.safeParse({ ...validLine, findNumber: 1.5 });
    expect(result.success).toBe(false);
  });
});

describe('BOMLineUpdateSchema', () => {
  it('requires id', () => {
    const result = BOMLineUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('allows partial update with just id', () => {
    const result = BOMLineUpdateSchema.parse({ id: 'bom-1' });
    expect(result.id).toBe('bom-1');
  });

  it('allows updating specific fields', () => {
    const result = BOMLineUpdateSchema.parse({ id: 'bom-1', quantity: 5, critical: true });
    expect(result.quantity).toBe(5);
    expect(result.critical).toBe(true);
  });
});

// =============================================================================
// ANALYTICS SCHEMAS
// =============================================================================

describe('AnalyticsQuerySchema', () => {
  it('parses valid query with defaults', () => {
    const result = AnalyticsQuerySchema.parse({});
    expect(result.tab).toBe('overview');
    expect(result.period).toBe(30);
  });

  it('parses all fields', () => {
    const result = AnalyticsQuerySchema.parse({
      tab: 'inventory',
      period: 90,
      startDate: '2024-01-01',
      endDate: '2024-03-31',
    });
    expect(result.tab).toBe('inventory');
    expect(result.period).toBe(90);
    expect(result.startDate).toBeInstanceOf(Date);
  });

  it('coerces period from string', () => {
    const result = AnalyticsQuerySchema.parse({ period: '60' });
    expect(result.period).toBe(60);
  });

  it('rejects period > 365', () => {
    const result = AnalyticsQuerySchema.safeParse({ period: 366 });
    expect(result.success).toBe(false);
  });

  it('rejects period < 1', () => {
    const result = AnalyticsQuerySchema.safeParse({ period: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid tab', () => {
    const result = AnalyticsQuerySchema.safeParse({ tab: 'finance' });
    expect(result.success).toBe(false);
  });

  it('validates all tab values', () => {
    for (const t of ['overview', 'inventory', 'sales', 'production', 'quality']) {
      expect(AnalyticsQuerySchema.parse({ tab: t }).tab).toBe(t);
    }
  });
});

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

describe('validateRequest', () => {
  it('returns success with valid data', () => {
    const result = validateRequest(IdSchema, { id: 'test-1' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('test-1');
    }
  });

  it('returns error response with invalid data', () => {
    const result = validateRequest(IdSchema, { id: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      // NextResponse is returned
      expect(result.error).toBeDefined();
    }
  });

  it('returns error response for completely wrong data', () => {
    const result = validateRequest(IdSchema, {});
    expect(result.success).toBe(false);
  });

  it('works with source query parameter', () => {
    const result = validateRequest(PaginationSchema, { page: '1' }, 'query');
    expect(result.success).toBe(true);
  });

  it('defaults source to body', () => {
    const result = validateRequest(IdSchema, { id: 'abc' });
    expect(result.success).toBe(true);
  });
});

describe('parseSearchParams', () => {
  it('parses URLSearchParams into schema', () => {
    const params = new URLSearchParams({ page: '2', pageSize: '10' });
    const result = parseSearchParams(PaginationSchema, params);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(10);
    }
  });

  it('applies defaults for missing params', () => {
    const params = new URLSearchParams();
    const result = parseSearchParams(PaginationSchema, params);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it('returns error for invalid params', () => {
    const params = new URLSearchParams({ id: '' });
    const result = parseSearchParams(IdSchema, params);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// SCHEMAS EXPORT OBJECT
// =============================================================================

describe('Schemas export', () => {
  it('exports all expected schemas', () => {
    expect(Schemas.Pagination).toBe(PaginationSchema);
    expect(Schemas.Sort).toBe(SortSchema);
    expect(Schemas.Search).toBe(SearchSchema);
    expect(Schemas.Id).toBe(IdSchema);
    expect(Schemas.DateRange).toBe(DateRangeSchema);
    expect(Schemas.PartFilters).toBe(PartFiltersSchema);
    expect(Schemas.PartQuery).toBe(PartQuerySchema);
    expect(Schemas.PartCreate).toBe(PartCreateSchema);
    expect(Schemas.PartUpdate).toBe(PartUpdateSchema);
    expect(Schemas.SalesOrderFilters).toBe(SalesOrderFiltersSchema);
    expect(Schemas.SalesOrderQuery).toBe(SalesOrderQuerySchema);
    expect(Schemas.SalesOrderCreate).toBe(SalesOrderCreateSchema);
    expect(Schemas.SalesOrderUpdate).toBe(SalesOrderUpdateSchema);
    expect(Schemas.WorkOrderFilters).toBe(WorkOrderFiltersSchema);
    expect(Schemas.WorkOrderQuery).toBe(WorkOrderQuerySchema);
    expect(Schemas.WorkOrderCreate).toBe(WorkOrderCreateSchema);
    expect(Schemas.WorkOrderUpdate).toBe(WorkOrderUpdateSchema);
    expect(Schemas.NCRFilters).toBe(NCRFiltersSchema);
    expect(Schemas.NCRQuery).toBe(NCRQuerySchema);
    expect(Schemas.NCRCreate).toBe(NCRCreateSchema);
    expect(Schemas.NCRUpdate).toBe(NCRUpdateSchema);
    expect(Schemas.InventoryFilters).toBe(InventoryFiltersSchema);
    expect(Schemas.InventoryQuery).toBe(InventoryQuerySchema);
    expect(Schemas.InventoryAction).toBe(InventoryActionSchema);
    expect(Schemas.BOMFilters).toBe(BOMFiltersSchema);
    expect(Schemas.BOMQuery).toBe(BOMQuerySchema);
    expect(Schemas.BOMLineCreate).toBe(BOMLineCreateSchema);
    expect(Schemas.BOMLineUpdate).toBe(BOMLineUpdateSchema);
    expect(Schemas.AnalyticsQuery).toBe(AnalyticsQuerySchema);
  });
});
