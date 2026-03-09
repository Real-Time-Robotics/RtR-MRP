import { describe, it, expect } from 'vitest';
import {
  BaseQuerySchema,
  DateFilterSchema,
  EquipmentQuerySchema,
  EquipmentCreateSchema,
  MaintenanceQuerySchema,
  MaintenanceCreateSchema,
  DowntimeQuerySchema,
  DowntimeCreateSchema,
  EmployeeQuerySchema,
  EmployeeCreateSchema,
  SkillQuerySchema,
  SkillCreateSchema,
  ShiftQuerySchema,
  ShiftCreateSchema,
  WorkCenterQuerySchema,
  WorkCenterCreateSchema,
  OEEQuerySchema,
  OEERecordSchema,
  CapacityQuerySchema,
  AlertQuerySchema,
  AlertCreateSchema,
  ReportQuerySchema,
  CustomerQuerySchema,
  CustomerCreateSchema,
  SupplierQuerySchema,
  SupplierCreateSchema,
  AIChatSchema,
  MobileInventoryActionSchema,
  MobileQualitySchema,
  TechnicianQuerySchema,
  DashboardQuerySchema,
  MRPRunSchema,
  PartQuerySchema,
  PartCreateSchema,
  InventoryQuerySchema,
  InventoryAdjustSchema,
  SalesOrderQuerySchema,
  SalesOrderCreateSchema,
  WorkOrderQuerySchema,
  WorkOrderCreateSchema,
  AdditionalSchemas,
} from '../additional-schemas';

// =============================================================================
// BASE SCHEMAS
// =============================================================================

describe('BaseQuerySchema', () => {
  it('should parse with defaults when empty object given', () => {
    const result = BaseQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.sortOrder).toBe('desc');
  });

  it('should coerce string numbers for page and pageSize', () => {
    const result = BaseQuerySchema.parse({ page: '3', pageSize: '50' });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(50);
  });

  it('should accept optional search and sortBy', () => {
    const result = BaseQuerySchema.parse({ search: 'test', sortBy: 'name' });
    expect(result.search).toBe('test');
    expect(result.sortBy).toBe('name');
  });

  it('should accept asc sortOrder', () => {
    const result = BaseQuerySchema.parse({ sortOrder: 'asc' });
    expect(result.sortOrder).toBe('asc');
  });

  it('should reject page < 1', () => {
    const result = BaseQuerySchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject pageSize > 100', () => {
    const result = BaseQuerySchema.safeParse({ pageSize: 101 });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer page', () => {
    const result = BaseQuerySchema.safeParse({ page: 1.5 });
    expect(result.success).toBe(false);
  });

  it('should reject invalid sortOrder', () => {
    const result = BaseQuerySchema.safeParse({ sortOrder: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should reject search exceeding 200 chars', () => {
    const result = BaseQuerySchema.safeParse({ search: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('should reject sortBy exceeding 50 chars', () => {
    const result = BaseQuerySchema.safeParse({ sortBy: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });
});

describe('DateFilterSchema', () => {
  it('should parse with no dates', () => {
    const result = DateFilterSchema.parse({});
    expect(result.startDate).toBeUndefined();
    expect(result.endDate).toBeUndefined();
  });

  it('should coerce date strings', () => {
    const result = DateFilterSchema.parse({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    });
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.endDate).toBeInstanceOf(Date);
  });

  it('should reject invalid date strings', () => {
    const result = DateFilterSchema.safeParse({ startDate: 'not-a-date' });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// EQUIPMENT SCHEMAS
// =============================================================================

describe('EquipmentQuerySchema', () => {
  it('should parse with all optional fields', () => {
    const result = EquipmentQuerySchema.parse({
      type: 'CNC',
      status: 'OPERATIONAL',
      workCenter: 'WC1',
    });
    expect(result.type).toBe('CNC');
    expect(result.status).toBe('OPERATIONAL');
    expect(result.workCenter).toBe('WC1');
  });

  it('should accept all valid status values', () => {
    for (const status of ['OPERATIONAL', 'MAINTENANCE', 'BREAKDOWN', 'DECOMMISSIONED']) {
      expect(EquipmentQuerySchema.parse({ status }).status).toBe(status);
    }
  });

  it('should reject invalid status', () => {
    const result = EquipmentQuerySchema.safeParse({ status: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('should inherit BaseQuerySchema defaults', () => {
    const result = EquipmentQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });
});

describe('EquipmentCreateSchema', () => {
  const validData = {
    code: 'EQ001',
    name: 'CNC Machine',
  };

  it('should parse valid minimal data', () => {
    const result = EquipmentCreateSchema.parse(validData);
    expect(result.code).toBe('EQ001');
    expect(result.name).toBe('CNC Machine');
  });

  it('should parse with all optional fields', () => {
    const result = EquipmentCreateSchema.parse({
      ...validData,
      type: 'CNC',
      manufacturer: 'Haas',
      model: 'VF-2',
      serialNumber: 'SN123',
      workCenter: 'WC1',
      purchaseDate: '2024-01-01',
      warrantyExpiry: '2026-01-01',
      notes: 'Test notes',
    });
    expect(result.purchaseDate).toBeInstanceOf(Date);
    expect(result.warrantyExpiry).toBeInstanceOf(Date);
  });

  it('should reject empty code', () => {
    const result = EquipmentCreateSchema.safeParse({ ...validData, code: '' });
    expect(result.success).toBe(false);
  });

  it('should reject empty name', () => {
    const result = EquipmentCreateSchema.safeParse({ ...validData, name: '' });
    expect(result.success).toBe(false);
  });

  it('should reject code exceeding 50 chars', () => {
    const result = EquipmentCreateSchema.safeParse({ ...validData, code: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('should reject notes exceeding 2000 chars', () => {
    const result = EquipmentCreateSchema.safeParse({ ...validData, notes: 'a'.repeat(2001) });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// MAINTENANCE SCHEMAS
// =============================================================================

describe('MaintenanceQuerySchema', () => {
  it('should parse with all filters', () => {
    const result = MaintenanceQuerySchema.parse({
      type: 'PREVENTIVE',
      status: 'SCHEDULED',
      equipmentId: 'EQ1',
      priority: 'high',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    });
    expect(result.type).toBe('PREVENTIVE');
    expect(result.status).toBe('SCHEDULED');
    expect(result.priority).toBe('high');
    expect(result.startDate).toBeInstanceOf(Date);
  });

  it('should accept all type values', () => {
    for (const type of ['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE']) {
      expect(MaintenanceQuerySchema.parse({ type }).type).toBe(type);
    }
  });

  it('should accept all status values', () => {
    for (const status of ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']) {
      expect(MaintenanceQuerySchema.parse({ status }).status).toBe(status);
    }
  });

  it('should accept all priority values', () => {
    for (const priority of ['low', 'normal', 'high', 'urgent']) {
      expect(MaintenanceQuerySchema.parse({ priority }).priority).toBe(priority);
    }
  });

  it('should reject invalid type', () => {
    expect(MaintenanceQuerySchema.safeParse({ type: 'BAD' }).success).toBe(false);
  });
});

describe('MaintenanceCreateSchema', () => {
  const validData = {
    equipmentId: 'EQ001',
    type: 'PREVENTIVE' as const,
    title: 'Monthly PM',
  };

  it('should parse valid data with defaults', () => {
    const result = MaintenanceCreateSchema.parse(validData);
    expect(result.priority).toBe('normal');
  });

  it('should parse with all optional fields', () => {
    const result = MaintenanceCreateSchema.parse({
      ...validData,
      description: 'Full maintenance',
      priority: 'urgent',
      scheduledDate: '2025-06-01',
      dueDate: '2025-06-15',
      estimatedHours: 4,
      assignedTo: 'John',
      notes: 'Important',
    });
    expect(result.estimatedHours).toBe(4);
    expect(result.scheduledDate).toBeInstanceOf(Date);
  });

  it('should reject missing equipmentId', () => {
    const { equipmentId, ...rest } = validData;
    expect(MaintenanceCreateSchema.safeParse(rest).success).toBe(false);
  });

  it('should reject missing type', () => {
    const { type, ...rest } = validData;
    expect(MaintenanceCreateSchema.safeParse(rest).success).toBe(false);
  });

  it('should reject negative estimatedHours', () => {
    expect(MaintenanceCreateSchema.safeParse({ ...validData, estimatedHours: -1 }).success).toBe(false);
  });
});

// =============================================================================
// DOWNTIME SCHEMAS
// =============================================================================

describe('DowntimeQuerySchema', () => {
  it('should parse with all filters', () => {
    const result = DowntimeQuerySchema.parse({
      type: 'PLANNED',
      equipmentId: 'EQ1',
      workCenter: 'WC1',
      startDate: '2025-01-01',
    });
    expect(result.type).toBe('PLANNED');
  });

  it('should accept all type values', () => {
    for (const type of ['PLANNED', 'UNPLANNED', 'SETUP', 'BREAKDOWN']) {
      expect(DowntimeQuerySchema.parse({ type }).type).toBe(type);
    }
  });

  it('should reject invalid type', () => {
    expect(DowntimeQuerySchema.safeParse({ type: 'INVALID' }).success).toBe(false);
  });
});

describe('DowntimeCreateSchema', () => {
  const validData = {
    equipmentId: 'EQ001',
    type: 'PLANNED' as const,
    reason: 'Scheduled maintenance',
    startTime: '2025-06-01T08:00:00Z',
  };

  it('should parse valid data', () => {
    const result = DowntimeCreateSchema.parse(validData);
    expect(result.startTime).toBeInstanceOf(Date);
    expect(result.endTime).toBeUndefined();
  });

  it('should parse with endTime and notes', () => {
    const result = DowntimeCreateSchema.parse({
      ...validData,
      endTime: '2025-06-01T10:00:00Z',
      notes: 'Completed early',
    });
    expect(result.endTime).toBeInstanceOf(Date);
  });

  it('should reject empty reason', () => {
    expect(DowntimeCreateSchema.safeParse({ ...validData, reason: '' }).success).toBe(false);
  });

  it('should reject reason exceeding 500 chars', () => {
    expect(DowntimeCreateSchema.safeParse({ ...validData, reason: 'a'.repeat(501) }).success).toBe(false);
  });

  it('should reject missing startTime', () => {
    const { startTime, ...rest } = validData;
    expect(DowntimeCreateSchema.safeParse(rest).success).toBe(false);
  });
});

// =============================================================================
// EMPLOYEE SCHEMAS
// =============================================================================

describe('EmployeeQuerySchema', () => {
  it('should parse with all filters', () => {
    const result = EmployeeQuerySchema.parse({
      department: 'Engineering',
      role: 'Technician',
      status: 'ACTIVE',
      workCenter: 'WC1',
    });
    expect(result.department).toBe('Engineering');
    expect(result.status).toBe('ACTIVE');
  });

  it('should accept all status values', () => {
    for (const status of ['ACTIVE', 'INACTIVE', 'ON_LEAVE']) {
      expect(EmployeeQuerySchema.parse({ status }).status).toBe(status);
    }
  });

  it('should reject invalid status', () => {
    expect(EmployeeQuerySchema.safeParse({ status: 'FIRED' }).success).toBe(false);
  });
});

describe('EmployeeCreateSchema', () => {
  const validData = {
    employeeNumber: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
  };

  it('should parse valid minimal data', () => {
    const result = EmployeeCreateSchema.parse(validData);
    expect(result.employeeNumber).toBe('EMP001');
  });

  it('should parse with all optional fields', () => {
    const result = EmployeeCreateSchema.parse({
      ...validData,
      email: 'john@example.com',
      phone: '123456',
      department: 'Eng',
      role: 'Tech',
      workCenter: 'WC1',
      hireDate: '2025-01-01',
      notes: 'Good worker',
    });
    expect(result.email).toBe('john@example.com');
    expect(result.hireDate).toBeInstanceOf(Date);
  });

  it('should reject invalid email', () => {
    expect(EmployeeCreateSchema.safeParse({ ...validData, email: 'notanemail' }).success).toBe(false);
  });

  it('should reject empty employeeNumber', () => {
    expect(EmployeeCreateSchema.safeParse({ ...validData, employeeNumber: '' }).success).toBe(false);
  });

  it('should reject empty firstName', () => {
    expect(EmployeeCreateSchema.safeParse({ ...validData, firstName: '' }).success).toBe(false);
  });

  it('should reject empty lastName', () => {
    expect(EmployeeCreateSchema.safeParse({ ...validData, lastName: '' }).success).toBe(false);
  });
});

// =============================================================================
// SKILL SCHEMAS
// =============================================================================

describe('SkillQuerySchema', () => {
  it('should parse with all filters', () => {
    const result = SkillQuerySchema.parse({
      category: 'Welding',
      level: 'EXPERT',
    });
    expect(result.category).toBe('Welding');
    expect(result.level).toBe('EXPERT');
  });

  it('should accept all level values', () => {
    for (const level of ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']) {
      expect(SkillQuerySchema.parse({ level }).level).toBe(level);
    }
  });

  it('should reject invalid level', () => {
    expect(SkillQuerySchema.safeParse({ level: 'MASTER' }).success).toBe(false);
  });
});

describe('SkillCreateSchema', () => {
  it('should parse valid data', () => {
    const result = SkillCreateSchema.parse({ name: 'Welding' });
    expect(result.name).toBe('Welding');
  });

  it('should parse with optional fields', () => {
    const result = SkillCreateSchema.parse({
      name: 'Welding',
      category: 'Manufacturing',
      description: 'MIG/TIG welding',
    });
    expect(result.category).toBe('Manufacturing');
  });

  it('should reject empty name', () => {
    expect(SkillCreateSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('should reject name exceeding 100 chars', () => {
    expect(SkillCreateSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false);
  });

  it('should reject description exceeding 500 chars', () => {
    expect(SkillCreateSchema.safeParse({ name: 'X', description: 'a'.repeat(501) }).success).toBe(false);
  });
});

// =============================================================================
// SHIFT SCHEMAS
// =============================================================================

describe('ShiftQuerySchema', () => {
  it('should parse with all filters', () => {
    const result = ShiftQuerySchema.parse({
      workCenter: 'WC1',
      isActive: 'true',
    });
    expect(result.isActive).toBe('true');
  });

  it('should accept isActive false', () => {
    const result = ShiftQuerySchema.parse({ isActive: 'false' });
    expect(result.isActive).toBe('false');
  });

  it('should reject invalid isActive', () => {
    expect(ShiftQuerySchema.safeParse({ isActive: 'yes' }).success).toBe(false);
  });
});

describe('ShiftCreateSchema', () => {
  const validData = {
    name: 'Morning Shift',
    startTime: '08:00',
    endTime: '16:00',
  };

  it('should parse valid data with defaults', () => {
    const result = ShiftCreateSchema.parse(validData);
    expect(result.isActive).toBe(true);
  });

  it('should parse with all optional fields', () => {
    const result = ShiftCreateSchema.parse({
      ...validData,
      workCenter: 'WC1',
      isActive: false,
      notes: 'Regular shift',
    });
    expect(result.isActive).toBe(false);
  });

  it('should reject invalid time format for startTime', () => {
    expect(ShiftCreateSchema.safeParse({ ...validData, startTime: '8:00' }).success).toBe(false);
  });

  it('should reject invalid time format for endTime', () => {
    expect(ShiftCreateSchema.safeParse({ ...validData, endTime: '4pm' }).success).toBe(false);
  });

  it('should reject empty name', () => {
    expect(ShiftCreateSchema.safeParse({ ...validData, name: '' }).success).toBe(false);
  });

  it('should reject notes exceeding 500 chars', () => {
    expect(ShiftCreateSchema.safeParse({ ...validData, notes: 'a'.repeat(501) }).success).toBe(false);
  });
});

// =============================================================================
// WORK CENTER SCHEMAS
// =============================================================================

describe('WorkCenterQuerySchema', () => {
  it('should parse with all filters', () => {
    const result = WorkCenterQuerySchema.parse({
      type: 'Assembly',
      status: 'ACTIVE',
    });
    expect(result.type).toBe('Assembly');
    expect(result.status).toBe('ACTIVE');
  });

  it('should accept all status values', () => {
    for (const status of ['ACTIVE', 'INACTIVE', 'MAINTENANCE']) {
      expect(WorkCenterQuerySchema.parse({ status }).status).toBe(status);
    }
  });

  it('should reject invalid status', () => {
    expect(WorkCenterQuerySchema.safeParse({ status: 'CLOSED' }).success).toBe(false);
  });
});

describe('WorkCenterCreateSchema', () => {
  const validData = {
    code: 'WC001',
    name: 'Assembly Line 1',
  };

  it('should parse valid minimal data', () => {
    const result = WorkCenterCreateSchema.parse(validData);
    expect(result.code).toBe('WC001');
  });

  it('should parse with all optional fields', () => {
    const result = WorkCenterCreateSchema.parse({
      ...validData,
      type: 'Assembly',
      capacity: 100,
      efficiency: 85,
      costPerHour: 50.5,
      notes: 'Main assembly line',
    });
    expect(result.capacity).toBe(100);
    expect(result.efficiency).toBe(85);
  });

  it('should reject negative capacity', () => {
    expect(WorkCenterCreateSchema.safeParse({ ...validData, capacity: -1 }).success).toBe(false);
  });

  it('should reject efficiency > 100', () => {
    expect(WorkCenterCreateSchema.safeParse({ ...validData, efficiency: 101 }).success).toBe(false);
  });

  it('should reject negative costPerHour', () => {
    expect(WorkCenterCreateSchema.safeParse({ ...validData, costPerHour: -1 }).success).toBe(false);
  });

  it('should reject empty code', () => {
    expect(WorkCenterCreateSchema.safeParse({ ...validData, code: '' }).success).toBe(false);
  });
});

// =============================================================================
// OEE SCHEMAS
// =============================================================================

describe('OEEQuerySchema', () => {
  it('should parse with defaults', () => {
    const result = OEEQuerySchema.parse({});
    expect(result.period).toBe('day');
  });

  it('should accept all period values', () => {
    for (const period of ['day', 'week', 'month', 'quarter', 'year']) {
      expect(OEEQuerySchema.parse({ period }).period).toBe(period);
    }
  });

  it('should parse with all filters', () => {
    const result = OEEQuerySchema.parse({
      equipmentId: 'EQ1',
      workCenter: 'WC1',
      period: 'month',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    });
    expect(result.equipmentId).toBe('EQ1');
  });

  it('should reject invalid period', () => {
    expect(OEEQuerySchema.safeParse({ period: 'decade' }).success).toBe(false);
  });
});

describe('OEERecordSchema', () => {
  const validData = {
    equipmentId: 'EQ001',
    date: '2025-06-01',
    plannedTime: 480,
    actualTime: 420,
    goodUnits: 950,
    totalUnits: 1000,
  };

  it('should parse valid data', () => {
    const result = OEERecordSchema.parse(validData);
    expect(result.date).toBeInstanceOf(Date);
    expect(result.goodUnits).toBe(950);
  });

  it('should parse with optional fields', () => {
    const result = OEERecordSchema.parse({
      ...validData,
      idealCycleTime: 0.5,
      notes: 'Good run',
    });
    expect(result.idealCycleTime).toBe(0.5);
  });

  it('should reject negative plannedTime', () => {
    expect(OEERecordSchema.safeParse({ ...validData, plannedTime: -1 }).success).toBe(false);
  });

  it('should reject negative actualTime', () => {
    expect(OEERecordSchema.safeParse({ ...validData, actualTime: -1 }).success).toBe(false);
  });

  it('should reject non-integer goodUnits', () => {
    expect(OEERecordSchema.safeParse({ ...validData, goodUnits: 1.5 }).success).toBe(false);
  });

  it('should reject non-integer totalUnits', () => {
    expect(OEERecordSchema.safeParse({ ...validData, totalUnits: 1.5 }).success).toBe(false);
  });

  it('should reject negative goodUnits', () => {
    expect(OEERecordSchema.safeParse({ ...validData, goodUnits: -1 }).success).toBe(false);
  });

  it('should reject missing equipmentId', () => {
    const { equipmentId, ...rest } = validData;
    expect(OEERecordSchema.safeParse(rest).success).toBe(false);
  });
});

// =============================================================================
// CAPACITY SCHEMAS
// =============================================================================

describe('CapacityQuerySchema', () => {
  it('should parse with all filters', () => {
    const result = CapacityQuerySchema.parse({
      workCenter: 'WC1',
      resourceType: 'MACHINE',
      startDate: '2025-01-01',
    });
    expect(result.resourceType).toBe('MACHINE');
  });

  it('should accept all resourceType values', () => {
    for (const rt of ['MACHINE', 'LABOR', 'BOTH']) {
      expect(CapacityQuerySchema.parse({ resourceType: rt }).resourceType).toBe(rt);
    }
  });

  it('should reject invalid resourceType', () => {
    expect(CapacityQuerySchema.safeParse({ resourceType: 'TOOL' }).success).toBe(false);
  });
});

// =============================================================================
// ALERT SCHEMAS
// =============================================================================

describe('AlertQuerySchema', () => {
  it('should parse with all filters', () => {
    const result = AlertQuerySchema.parse({
      type: 'CRITICAL',
      status: 'NEW',
      category: 'Equipment',
    });
    expect(result.type).toBe('CRITICAL');
    expect(result.status).toBe('NEW');
  });

  it('should accept all type values', () => {
    for (const type of ['INFO', 'WARNING', 'ERROR', 'CRITICAL']) {
      expect(AlertQuerySchema.parse({ type }).type).toBe(type);
    }
  });

  it('should accept all status values', () => {
    for (const status of ['NEW', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED']) {
      expect(AlertQuerySchema.parse({ status }).status).toBe(status);
    }
  });
});

describe('AlertCreateSchema', () => {
  const validData = {
    type: 'WARNING' as const,
    category: 'Equipment',
    title: 'High temperature alert',
    message: 'Temperature exceeds threshold',
  };

  it('should parse valid data', () => {
    const result = AlertCreateSchema.parse(validData);
    expect(result.type).toBe('WARNING');
  });

  it('should parse with optional fields', () => {
    const result = AlertCreateSchema.parse({
      ...validData,
      source: 'Sensor-1',
      entityType: 'Equipment',
      entityId: 'EQ001',
    });
    expect(result.source).toBe('Sensor-1');
  });

  it('should reject empty category', () => {
    expect(AlertCreateSchema.safeParse({ ...validData, category: '' }).success).toBe(false);
  });

  it('should reject empty title', () => {
    expect(AlertCreateSchema.safeParse({ ...validData, title: '' }).success).toBe(false);
  });

  it('should reject empty message', () => {
    expect(AlertCreateSchema.safeParse({ ...validData, message: '' }).success).toBe(false);
  });

  it('should reject message exceeding 2000 chars', () => {
    expect(AlertCreateSchema.safeParse({ ...validData, message: 'a'.repeat(2001) }).success).toBe(false);
  });
});

// =============================================================================
// REPORT SCHEMAS
// =============================================================================

describe('ReportQuerySchema', () => {
  it('should parse with type and default format', () => {
    const result = ReportQuerySchema.parse({ type: 'INVENTORY' });
    expect(result.format).toBe('JSON');
  });

  it('should accept all type values', () => {
    for (const type of ['INVENTORY', 'SALES', 'PRODUCTION', 'QUALITY', 'MRP', 'OEE', 'CUSTOM']) {
      expect(ReportQuerySchema.parse({ type }).type).toBe(type);
    }
  });

  it('should accept all format values', () => {
    for (const format of ['JSON', 'CSV', 'XLSX', 'PDF']) {
      expect(ReportQuerySchema.parse({ type: 'INVENTORY', format }).format).toBe(format);
    }
  });

  it('should accept optional filters record', () => {
    const result = ReportQuerySchema.parse({
      type: 'SALES',
      filters: { warehouse: 'WH1', status: 'active' },
    });
    expect(result.filters).toEqual({ warehouse: 'WH1', status: 'active' });
  });

  it('should reject missing type', () => {
    expect(ReportQuerySchema.safeParse({}).success).toBe(false);
  });

  it('should reject invalid type', () => {
    expect(ReportQuerySchema.safeParse({ type: 'FINANCE' }).success).toBe(false);
  });
});

// =============================================================================
// CUSTOMER SCHEMAS
// =============================================================================

describe('CustomerQuerySchema', () => {
  it('should parse with all filters', () => {
    const result = CustomerQuerySchema.parse({
      country: 'VN',
      status: 'ACTIVE',
    });
    expect(result.country).toBe('VN');
    expect(result.status).toBe('ACTIVE');
  });

  it('should accept all status values', () => {
    for (const status of ['ACTIVE', 'INACTIVE', 'PROSPECT', 'BLOCKED']) {
      expect(CustomerQuerySchema.parse({ status }).status).toBe(status);
    }
  });
});

describe('CustomerCreateSchema', () => {
  const validData = {
    code: 'C001',
    name: 'Acme Corp',
  };

  it('should parse valid data with currency default', () => {
    const result = CustomerCreateSchema.parse(validData);
    expect(result.currency).toBe('USD');
  });

  it('should parse with all optional fields', () => {
    const result = CustomerCreateSchema.parse({
      ...validData,
      email: 'acme@example.com',
      phone: '+1234567890',
      address: '123 Main St',
      city: 'Springfield',
      country: 'US',
      currency: 'EUR',
      paymentTerms: 'Net30',
      creditLimit: 10000,
      notes: 'VIP customer',
    });
    expect(result.currency).toBe('EUR');
    expect(result.creditLimit).toBe(10000);
  });

  it('should reject currency not exactly 3 chars', () => {
    expect(CustomerCreateSchema.safeParse({ ...validData, currency: 'US' }).success).toBe(false);
    expect(CustomerCreateSchema.safeParse({ ...validData, currency: 'USDD' }).success).toBe(false);
  });

  it('should reject negative creditLimit', () => {
    expect(CustomerCreateSchema.safeParse({ ...validData, creditLimit: -100 }).success).toBe(false);
  });

  it('should reject invalid email', () => {
    expect(CustomerCreateSchema.safeParse({ ...validData, email: 'bad' }).success).toBe(false);
  });

  it('should reject empty code', () => {
    expect(CustomerCreateSchema.safeParse({ ...validData, code: '' }).success).toBe(false);
  });

  it('should reject empty name', () => {
    expect(CustomerCreateSchema.safeParse({ ...validData, name: '' }).success).toBe(false);
  });
});

// =============================================================================
// SUPPLIER SCHEMAS
// =============================================================================

describe('SupplierQuerySchema', () => {
  it('should parse with all filters', () => {
    const result = SupplierQuerySchema.parse({
      country: 'CN',
      status: 'ACTIVE',
      isApproved: 'true',
    });
    expect(result.isApproved).toBe('true');
  });

  it('should accept all status values', () => {
    for (const status of ['ACTIVE', 'INACTIVE', 'PENDING', 'BLOCKED']) {
      expect(SupplierQuerySchema.parse({ status }).status).toBe(status);
    }
  });

  it('should reject invalid isApproved', () => {
    expect(SupplierQuerySchema.safeParse({ isApproved: 'yes' }).success).toBe(false);
  });
});

describe('SupplierCreateSchema', () => {
  const validData = {
    code: 'S001',
    name: 'Steel Supplier',
  };

  it('should parse valid data with defaults', () => {
    const result = SupplierCreateSchema.parse(validData);
    expect(result.currency).toBe('USD');
    expect(result.leadTimeDays).toBe(0);
  });

  it('should parse with all optional fields', () => {
    const result = SupplierCreateSchema.parse({
      ...validData,
      email: 'supplier@example.com',
      phone: '+1234567890',
      address: '456 Industrial Ave',
      city: 'Manufacturing City',
      country: 'CN',
      currency: 'CNY',
      paymentTerms: 'Net60',
      leadTimeDays: 14,
      notes: 'Reliable supplier',
    });
    expect(result.leadTimeDays).toBe(14);
  });

  it('should reject negative leadTimeDays', () => {
    expect(SupplierCreateSchema.safeParse({ ...validData, leadTimeDays: -1 }).success).toBe(false);
  });

  it('should reject non-integer leadTimeDays', () => {
    expect(SupplierCreateSchema.safeParse({ ...validData, leadTimeDays: 1.5 }).success).toBe(false);
  });

  it('should reject currency not exactly 3 chars', () => {
    expect(SupplierCreateSchema.safeParse({ ...validData, currency: 'AB' }).success).toBe(false);
  });
});

// =============================================================================
// AI CHAT SCHEMA
// =============================================================================

describe('AIChatSchema', () => {
  it('should parse valid message', () => {
    const result = AIChatSchema.parse({ message: 'Hello' });
    expect(result.message).toBe('Hello');
  });

  it('should parse with optional fields', () => {
    const result = AIChatSchema.parse({
      message: 'What is MRP?',
      context: 'Manufacturing context',
      conversationId: 'conv-123',
    });
    expect(result.context).toBe('Manufacturing context');
  });

  it('should reject empty message', () => {
    expect(AIChatSchema.safeParse({ message: '' }).success).toBe(false);
  });

  it('should reject message exceeding 5000 chars', () => {
    expect(AIChatSchema.safeParse({ message: 'a'.repeat(5001) }).success).toBe(false);
  });

  it('should reject context exceeding 2000 chars', () => {
    expect(AIChatSchema.safeParse({ message: 'hi', context: 'a'.repeat(2001) }).success).toBe(false);
  });
});

// =============================================================================
// MOBILE SCHEMAS
// =============================================================================

describe('MobileInventoryActionSchema', () => {
  it('should parse valid action', () => {
    const result = MobileInventoryActionSchema.parse({ action: 'scan' });
    expect(result.action).toBe('scan');
  });

  it('should accept all action values', () => {
    for (const action of ['scan', 'count', 'adjust', 'transfer', 'receive', 'pick']) {
      expect(MobileInventoryActionSchema.parse({ action }).action).toBe(action);
    }
  });

  it('should parse with all optional fields', () => {
    const result = MobileInventoryActionSchema.parse({
      action: 'count',
      partId: 'P001',
      barcode: '1234567890',
      warehouseId: 'WH1',
      locationId: 'LOC-A1',
      quantity: 100,
      lotNumber: 'LOT001',
      notes: 'Count verified',
    });
    expect(result.quantity).toBe(100);
  });

  it('should reject invalid action', () => {
    expect(MobileInventoryActionSchema.safeParse({ action: 'delete' }).success).toBe(false);
  });
});

describe('MobileQualitySchema', () => {
  it('should parse valid action', () => {
    const result = MobileQualitySchema.parse({ action: 'inspection' });
    expect(result.action).toBe('inspection');
  });

  it('should accept all action values', () => {
    for (const action of ['inspection', 'measurement', 'ncr', 'approve', 'reject']) {
      expect(MobileQualitySchema.parse({ action }).action).toBe(action);
    }
  });

  it('should parse with all optional fields', () => {
    const result = MobileQualitySchema.parse({
      action: 'measurement',
      partId: 'P001',
      workOrderId: 'WO001',
      characteristic: 'Length',
      measuredValue: 25.4,
      isPass: true,
      notes: 'Within tolerance',
    });
    expect(result.measuredValue).toBe(25.4);
    expect(result.isPass).toBe(true);
  });

  it('should reject invalid action', () => {
    expect(MobileQualitySchema.safeParse({ action: 'delete' }).success).toBe(false);
  });
});

// =============================================================================
// TECHNICIAN SCHEMA
// =============================================================================

describe('TechnicianQuerySchema', () => {
  it('should parse with all filters', () => {
    const result = TechnicianQuerySchema.parse({
      status: 'AVAILABLE',
      skill: 'Welding',
    });
    expect(result.status).toBe('AVAILABLE');
    expect(result.skill).toBe('Welding');
  });

  it('should accept all status values', () => {
    for (const status of ['AVAILABLE', 'BUSY', 'OFF_DUTY']) {
      expect(TechnicianQuerySchema.parse({ status }).status).toBe(status);
    }
  });

  it('should reject invalid status', () => {
    expect(TechnicianQuerySchema.safeParse({ status: 'FIRED' }).success).toBe(false);
  });
});

// =============================================================================
// DASHBOARD SCHEMA
// =============================================================================

describe('DashboardQuerySchema', () => {
  it('should parse with defaults', () => {
    const result = DashboardQuerySchema.parse({});
    expect(result.period).toBe(30);
  });

  it('should coerce string period', () => {
    const result = DashboardQuerySchema.parse({ period: '7' });
    expect(result.period).toBe(7);
  });

  it('should accept optional dates and widgets', () => {
    const result = DashboardQuerySchema.parse({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      widgets: ['oee', 'inventory', 'alerts'],
    });
    expect(result.widgets).toEqual(['oee', 'inventory', 'alerts']);
  });

  it('should reject period < 1', () => {
    expect(DashboardQuerySchema.safeParse({ period: 0 }).success).toBe(false);
  });

  it('should reject period > 365', () => {
    expect(DashboardQuerySchema.safeParse({ period: 366 }).success).toBe(false);
  });

  it('should reject non-integer period', () => {
    expect(DashboardQuerySchema.safeParse({ period: 7.5 }).success).toBe(false);
  });
});

// =============================================================================
// MRP RUN SCHEMA
// =============================================================================

describe('MRPRunSchema', () => {
  it('should parse with defaults', () => {
    const result = MRPRunSchema.parse({});
    expect(result.planningHorizon).toBe(30);
    expect(result.includeDemand).toBe(true);
    expect(result.includeSupply).toBe(true);
    expect(result.includeWIP).toBe(true);
    expect(result.includeForecasts).toBe(false);
  });

  it('should parse with all fields', () => {
    const result = MRPRunSchema.parse({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      planningHorizon: 90,
      includeDemand: false,
      includeSupply: false,
      includeWIP: false,
      includeForecasts: true,
    });
    expect(result.planningHorizon).toBe(90);
    expect(result.includeForecasts).toBe(true);
    expect(result.includeDemand).toBe(false);
  });

  it('should reject planningHorizon < 1', () => {
    expect(MRPRunSchema.safeParse({ planningHorizon: 0 }).success).toBe(false);
  });

  it('should reject planningHorizon > 365', () => {
    expect(MRPRunSchema.safeParse({ planningHorizon: 366 }).success).toBe(false);
  });

  it('should coerce string planningHorizon', () => {
    const result = MRPRunSchema.parse({ planningHorizon: '60' });
    expect(result.planningHorizon).toBe(60);
  });
});

// =============================================================================
// PART SCHEMAS
// =============================================================================

describe('PartQuerySchema', () => {
  it('should parse with all filters', () => {
    const result = PartQuerySchema.parse({
      category: 'FINISHED_GOOD',
      lifecycleStatus: 'ACTIVE',
      makeOrBuy: 'MAKE',
      ndaaCompliant: 'true',
      includeRelations: 'true',
      supplierId: 'S001',
    });
    expect(result.category).toBe('FINISHED_GOOD');
    expect(result.lifecycleStatus).toBe('ACTIVE');
    expect(result.makeOrBuy).toBe('MAKE');
  });

  it('should accept all category values', () => {
    for (const cat of ['FINISHED_GOOD', 'COMPONENT', 'RAW_MATERIAL', 'PACKAGING', 'CONSUMABLE', 'TOOL']) {
      expect(PartQuerySchema.parse({ category: cat }).category).toBe(cat);
    }
  });

  it('should accept all lifecycleStatus values', () => {
    for (const s of ['DEVELOPMENT', 'PROTOTYPE', 'ACTIVE', 'PHASE_OUT', 'OBSOLETE', 'EOL']) {
      expect(PartQuerySchema.parse({ lifecycleStatus: s }).lifecycleStatus).toBe(s);
    }
  });

  it('should reject invalid category', () => {
    expect(PartQuerySchema.safeParse({ category: 'INVALID' }).success).toBe(false);
  });
});

describe('PartCreateSchema', () => {
  const validData = {
    partNumber: 'PN001',
    name: 'Widget A',
    category: 'COMPONENT' as const,
  };

  it('should parse valid minimal data with preprocess defaults', () => {
    const result = PartCreateSchema.parse(validData);
    expect(result.unit).toBe('EA');
    expect(result.revision).toBe('A');
    expect(result.lifecycleStatus).toBe('ACTIVE');
    expect(result.makeOrBuy).toBe('BUY');
    expect(result.moq).toBe(1);
    expect(result.orderMultiple).toBe(1);
    expect(result.ndaaCompliant).toBe(true);
    expect(result.itarControlled).toBe(false);
    expect(result.lotControl).toBe(false);
    expect(result.serialControl).toBe(false);
    expect(result.inspectionRequired).toBe(true);
    expect(result.certificateRequired).toBe(false);
    expect(result.rohsCompliant).toBe(true);
    expect(result.reachCompliant).toBe(true);
    expect(result.isCritical).toBe(false);
  });

  it('should accept null values for nullish fields', () => {
    const result = PartCreateSchema.parse({
      ...validData,
      id: null,
      description: null,
      tags: null,
      unitCost: null,
      standardCost: null,
      averageCost: null,
      landedCost: null,
      freightPercent: null,
      dutyPercent: null,
      overheadPercent: null,
      priceBreakQty1: null,
      priceBreakCost1: null,
      priceBreakQty2: null,
      priceBreakCost2: null,
      priceBreakQty3: null,
      priceBreakCost3: null,
      minStockLevel: null,
      reorderPoint: null,
      maxStock: null,
      safetyStock: null,
      leadTimeDays: null,
      procurementType: null,
      buyerCode: null,
      standardPack: null,
      weightKg: null,
      lengthMm: null,
      widthMm: null,
      heightMm: null,
      volumeCm3: null,
      color: null,
      material: null,
      drawingNumber: null,
      drawingUrl: null,
      datasheetUrl: null,
      specDocument: null,
      manufacturer: null,
      manufacturerPn: null,
      subCategory: null,
      partType: null,
      countryOfOrigin: null,
      hsCode: null,
      eccn: null,
      shelfLifeDays: null,
      inspectionPlan: null,
      aqlLevel: null,
      revisionDate: null,
      primarySupplierId: null,
      secondarySupplierIds: null,
    });
    expect(result.id).toBeNull();
    expect(result.description).toBeNull();
  });

  it('should accept undefined for nullish fields', () => {
    const result = PartCreateSchema.parse({
      ...validData,
      id: undefined,
      description: undefined,
      unitCost: undefined,
    });
    expect(result.id).toBeUndefined();
  });

  it('should preprocess null to default for preprocess fields', () => {
    const result = PartCreateSchema.parse({
      ...validData,
      unit: null,
      revision: null,
      lifecycleStatus: null,
      makeOrBuy: null,
      moq: null,
      orderMultiple: null,
      ndaaCompliant: null,
      itarControlled: null,
      lotControl: null,
      serialControl: null,
      inspectionRequired: null,
      certificateRequired: null,
      rohsCompliant: null,
      reachCompliant: null,
      isCritical: null,
    });
    expect(result.unit).toBe('EA');
    expect(result.revision).toBe('A');
    expect(result.lifecycleStatus).toBe('ACTIVE');
    expect(result.makeOrBuy).toBe('BUY');
    expect(result.moq).toBe(1);
    expect(result.orderMultiple).toBe(1);
    expect(result.ndaaCompliant).toBe(true);
    expect(result.isCritical).toBe(false);
  });

  it('should parse with explicit values overriding defaults', () => {
    const result = PartCreateSchema.parse({
      ...validData,
      unit: 'KG',
      revision: 'B',
      lifecycleStatus: 'PROTOTYPE',
      makeOrBuy: 'MAKE',
      moq: 10,
      orderMultiple: 5,
      ndaaCompliant: false,
      itarControlled: true,
      isCritical: true,
    });
    expect(result.unit).toBe('KG');
    expect(result.revision).toBe('B');
    expect(result.lifecycleStatus).toBe('PROTOTYPE');
    expect(result.makeOrBuy).toBe('MAKE');
    expect(result.moq).toBe(10);
    expect(result.itarControlled).toBe(true);
    expect(result.isCritical).toBe(true);
  });

  it('should parse with cost fields', () => {
    const result = PartCreateSchema.parse({
      ...validData,
      unitCost: 10.5,
      standardCost: 12,
      averageCost: 11.2,
      landedCost: 15,
      freightPercent: 5,
      dutyPercent: 3,
      overheadPercent: 8,
      priceBreakQty1: 100,
      priceBreakCost1: 9.5,
    });
    expect(result.unitCost).toBe(10.5);
    expect(result.priceBreakQty1).toBe(100);
  });

  it('should parse with planning fields', () => {
    const result = PartCreateSchema.parse({
      ...validData,
      minStockLevel: 10,
      reorderPoint: 20,
      maxStock: 100,
      safetyStock: 5,
      leadTimeDays: 7,
      procurementType: 'STOCK',
      buyerCode: 'BUY01',
      standardPack: 10,
    });
    expect(result.minStockLevel).toBe(10);
    expect(result.procurementType).toBe('STOCK');
  });

  it('should parse with spec fields', () => {
    const result = PartCreateSchema.parse({
      ...validData,
      weightKg: 2.5,
      lengthMm: 100,
      widthMm: 50,
      heightMm: 30,
      volumeCm3: 150,
      color: 'Red',
      material: 'Steel',
      drawingNumber: 'DWG-001',
      drawingUrl: 'https://example.com/dwg',
      datasheetUrl: 'https://example.com/ds',
      specDocument: 'https://example.com/spec',
      manufacturer: 'Acme',
      manufacturerPn: 'MFR-001',
      subCategory: 'Fastener',
      partType: 'Bolt',
    });
    expect(result.weightKg).toBe(2.5);
    expect(result.manufacturer).toBe('Acme');
  });

  it('should parse with compliance fields', () => {
    const result = PartCreateSchema.parse({
      ...validData,
      countryOfOrigin: 'US',
      hsCode: '7318.15',
      eccn: 'EAR99',
      shelfLifeDays: 365,
      inspectionPlan: 'IP-001',
      aqlLevel: '2.5',
    });
    expect(result.countryOfOrigin).toBe('US');
    expect(result.shelfLifeDays).toBe(365);
  });

  it('should parse with supplier fields', () => {
    const result = PartCreateSchema.parse({
      ...validData,
      primarySupplierId: 'S001',
      secondarySupplierIds: ['S002', 'S003'],
    });
    expect(result.primarySupplierId).toBe('S001');
    expect(result.secondarySupplierIds).toEqual(['S002', 'S003']);
  });

  it('should accept SEMI_FINISHED category (create only)', () => {
    const result = PartCreateSchema.parse({ ...validData, category: 'SEMI_FINISHED' });
    expect(result.category).toBe('SEMI_FINISHED');
  });

  it('should reject empty partNumber', () => {
    expect(PartCreateSchema.safeParse({ ...validData, partNumber: '' }).success).toBe(false);
  });

  it('should reject empty name', () => {
    expect(PartCreateSchema.safeParse({ ...validData, name: '' }).success).toBe(false);
  });

  it('should reject negative unitCost', () => {
    expect(PartCreateSchema.safeParse({ ...validData, unitCost: -1 }).success).toBe(false);
  });

  it('should reject negative minStockLevel', () => {
    expect(PartCreateSchema.safeParse({ ...validData, minStockLevel: -1 }).success).toBe(false);
  });

  it('should reject moq < 1 when explicitly provided', () => {
    expect(PartCreateSchema.safeParse({ ...validData, moq: 0 }).success).toBe(false);
  });

  it('should reject invalid lifecycleStatus', () => {
    expect(PartCreateSchema.safeParse({ ...validData, lifecycleStatus: 'INVALID' }).success).toBe(false);
  });

  it('should reject invalid category', () => {
    expect(PartCreateSchema.safeParse({ ...validData, category: 'INVALID' }).success).toBe(false);
  });

  it('should accept revisionDate as string', () => {
    const result = PartCreateSchema.parse({ ...validData, revisionDate: '2025-06-01' });
    expect(result.revisionDate).toBe('2025-06-01');
  });

  it('should parse with tags array', () => {
    const result = PartCreateSchema.parse({ ...validData, tags: ['critical', 'imported'] });
    expect(result.tags).toEqual(['critical', 'imported']);
  });
});

// =============================================================================
// INVENTORY SCHEMAS
// =============================================================================

describe('InventoryQuerySchema', () => {
  it('should parse with all filters', () => {
    const result = InventoryQuerySchema.parse({
      partId: 'P001',
      warehouseId: 'WH1',
      status: 'critical',
    });
    expect(result.status).toBe('critical');
  });

  it('should accept all status values', () => {
    for (const status of ['critical', 'reorder', 'ok', 'all']) {
      expect(InventoryQuerySchema.parse({ status }).status).toBe(status);
    }
  });

  it('should reject invalid status', () => {
    expect(InventoryQuerySchema.safeParse({ status: 'low' }).success).toBe(false);
  });
});

describe('InventoryAdjustSchema', () => {
  const validData = {
    partId: 'P001',
    warehouseId: 'WH1',
    quantity: 10,
    reason: 'RECEIPT' as const,
  };

  it('should parse valid data', () => {
    const result = InventoryAdjustSchema.parse(validData);
    expect(result.quantity).toBe(10);
  });

  it('should accept negative quantity (for issues)', () => {
    const result = InventoryAdjustSchema.parse({ ...validData, quantity: -5 });
    expect(result.quantity).toBe(-5);
  });

  it('should parse with all optional fields', () => {
    const result = InventoryAdjustSchema.parse({
      ...validData,
      reference: 'PO-001',
      lotNumber: 'LOT001',
      notes: 'Received shipment',
    });
    expect(result.reference).toBe('PO-001');
  });

  it('should accept all reason values', () => {
    for (const reason of ['RECEIPT', 'ISSUE', 'ADJUSTMENT', 'TRANSFER', 'SCRAP', 'COUNT']) {
      expect(InventoryAdjustSchema.parse({ ...validData, reason }).reason).toBe(reason);
    }
  });

  it('should reject invalid reason', () => {
    expect(InventoryAdjustSchema.safeParse({ ...validData, reason: 'THEFT' }).success).toBe(false);
  });

  it('should reject empty partId', () => {
    expect(InventoryAdjustSchema.safeParse({ ...validData, partId: '' }).success).toBe(false);
  });

  it('should reject empty warehouseId', () => {
    expect(InventoryAdjustSchema.safeParse({ ...validData, warehouseId: '' }).success).toBe(false);
  });
});

// =============================================================================
// SALES ORDER SCHEMAS
// =============================================================================

describe('SalesOrderQuerySchema', () => {
  it('should parse with all filters', () => {
    const result = SalesOrderQuerySchema.parse({
      customerId: 'C001',
      status: 'CONFIRMED',
      priority: 'HIGH',
      startDate: '2025-01-01',
    });
    expect(result.status).toBe('CONFIRMED');
    expect(result.priority).toBe('HIGH');
  });

  it('should accept all status values', () => {
    for (const status of ['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'CANCELLED']) {
      expect(SalesOrderQuerySchema.parse({ status }).status).toBe(status);
    }
  });

  it('should accept all priority values', () => {
    for (const priority of ['LOW', 'NORMAL', 'HIGH', 'URGENT']) {
      expect(SalesOrderQuerySchema.parse({ priority }).priority).toBe(priority);
    }
  });

  it('should reject invalid status', () => {
    expect(SalesOrderQuerySchema.safeParse({ status: 'PENDING' }).success).toBe(false);
  });
});

describe('SalesOrderCreateSchema', () => {
  const validData = {
    customerId: 'C001',
    lines: [{ partId: 'P001', quantity: 10 }],
  };

  it('should parse valid data with defaults', () => {
    const result = SalesOrderCreateSchema.parse(validData);
    expect(result.priority).toBe('NORMAL');
  });

  it('should parse with all optional fields', () => {
    const result = SalesOrderCreateSchema.parse({
      ...validData,
      orderNumber: 'SO-001',
      orderDate: '2025-06-01',
      requestedDate: '2025-07-01',
      priority: 'URGENT',
      notes: 'Rush order',
      lines: [
        {
          partId: 'P001',
          quantity: 10,
          unitPrice: 25.50,
          requestedDate: '2025-07-01',
        },
      ],
    });
    expect(result.orderDate).toBeInstanceOf(Date);
    expect(result.lines[0].unitPrice).toBe(25.50);
  });

  it('should reject empty lines array', () => {
    expect(SalesOrderCreateSchema.safeParse({ ...validData, lines: [] }).success).toBe(false);
  });

  it('should reject line with quantity < 1', () => {
    expect(SalesOrderCreateSchema.safeParse({
      ...validData,
      lines: [{ partId: 'P001', quantity: 0 }],
    }).success).toBe(false);
  });

  it('should reject line with empty partId', () => {
    expect(SalesOrderCreateSchema.safeParse({
      ...validData,
      lines: [{ partId: '', quantity: 1 }],
    }).success).toBe(false);
  });

  it('should reject line with negative unitPrice', () => {
    expect(SalesOrderCreateSchema.safeParse({
      ...validData,
      lines: [{ partId: 'P001', quantity: 1, unitPrice: -1 }],
    }).success).toBe(false);
  });

  it('should reject empty customerId', () => {
    expect(SalesOrderCreateSchema.safeParse({ ...validData, customerId: '' }).success).toBe(false);
  });

  it('should accept multiple lines', () => {
    const result = SalesOrderCreateSchema.parse({
      ...validData,
      lines: [
        { partId: 'P001', quantity: 10 },
        { partId: 'P002', quantity: 5 },
      ],
    });
    expect(result.lines).toHaveLength(2);
  });
});

// =============================================================================
// WORK ORDER SCHEMAS
// =============================================================================

describe('WorkOrderQuerySchema', () => {
  it('should parse with all filters', () => {
    const result = WorkOrderQuerySchema.parse({
      partId: 'P001',
      status: 'IN_PROGRESS',
      workCenter: 'WC1',
      priority: 'HIGH',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    });
    expect(result.status).toBe('IN_PROGRESS');
    expect(result.priority).toBe('HIGH');
  });

  it('should accept all status values', () => {
    for (const status of ['PLANNED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']) {
      expect(WorkOrderQuerySchema.parse({ status }).status).toBe(status);
    }
  });

  it('should accept all priority values', () => {
    for (const priority of ['LOW', 'NORMAL', 'HIGH', 'URGENT']) {
      expect(WorkOrderQuerySchema.parse({ priority }).priority).toBe(priority);
    }
  });

  it('should reject invalid status', () => {
    expect(WorkOrderQuerySchema.safeParse({ status: 'PENDING' }).success).toBe(false);
  });
});

describe('WorkOrderCreateSchema', () => {
  const validData = {
    productId: 'P001',
    quantity: 100,
  };

  it('should parse valid data with defaults', () => {
    const result = WorkOrderCreateSchema.parse(validData);
    expect(result.priority).toBe('normal');
    expect(result.woType).toBe('DISCRETE');
  });

  it('should parse with all optional fields', () => {
    const result = WorkOrderCreateSchema.parse({
      ...validData,
      plannedStart: '2025-06-01',
      plannedEnd: '2025-06-15',
      priority: 'urgent',
      salesOrderId: 'SO-001',
      salesOrderLine: 1,
      notes: 'Urgent production',
      woType: 'BATCH',
      batchSize: 50,
    });
    expect(result.plannedStart).toBeInstanceOf(Date);
    expect(result.woType).toBe('BATCH');
    expect(result.batchSize).toBe(50);
  });

  it('should reject quantity < 1', () => {
    expect(WorkOrderCreateSchema.safeParse({ ...validData, quantity: 0 }).success).toBe(false);
  });

  it('should reject non-integer quantity', () => {
    expect(WorkOrderCreateSchema.safeParse({ ...validData, quantity: 1.5 }).success).toBe(false);
  });

  it('should reject empty productId', () => {
    expect(WorkOrderCreateSchema.safeParse({ ...validData, productId: '' }).success).toBe(false);
  });

  it('should reject invalid woType', () => {
    expect(WorkOrderCreateSchema.safeParse({ ...validData, woType: 'CONTINUOUS' }).success).toBe(false);
  });

  it('should reject batchSize < 1', () => {
    expect(WorkOrderCreateSchema.safeParse({ ...validData, batchSize: 0 }).success).toBe(false);
  });

  it('should reject salesOrderLine < 1', () => {
    expect(WorkOrderCreateSchema.safeParse({ ...validData, salesOrderLine: 0 }).success).toBe(false);
  });

  it('should reject invalid priority', () => {
    expect(WorkOrderCreateSchema.safeParse({ ...validData, priority: 'CRITICAL' }).success).toBe(false);
  });
});

// =============================================================================
// ADDITIONAL SCHEMAS EXPORT
// =============================================================================

describe('AdditionalSchemas export object', () => {
  it('should export all schemas', () => {
    expect(AdditionalSchemas.BaseQuery).toBe(BaseQuerySchema);
    expect(AdditionalSchemas.DateFilter).toBe(DateFilterSchema);
    expect(AdditionalSchemas.EquipmentQuery).toBe(EquipmentQuerySchema);
    expect(AdditionalSchemas.EquipmentCreate).toBe(EquipmentCreateSchema);
    expect(AdditionalSchemas.MaintenanceQuery).toBe(MaintenanceQuerySchema);
    expect(AdditionalSchemas.MaintenanceCreate).toBe(MaintenanceCreateSchema);
    expect(AdditionalSchemas.DowntimeQuery).toBe(DowntimeQuerySchema);
    expect(AdditionalSchemas.DowntimeCreate).toBe(DowntimeCreateSchema);
    expect(AdditionalSchemas.EmployeeQuery).toBe(EmployeeQuerySchema);
    expect(AdditionalSchemas.EmployeeCreate).toBe(EmployeeCreateSchema);
    expect(AdditionalSchemas.SkillQuery).toBe(SkillQuerySchema);
    expect(AdditionalSchemas.SkillCreate).toBe(SkillCreateSchema);
    expect(AdditionalSchemas.ShiftQuery).toBe(ShiftQuerySchema);
    expect(AdditionalSchemas.ShiftCreate).toBe(ShiftCreateSchema);
    expect(AdditionalSchemas.WorkCenterQuery).toBe(WorkCenterQuerySchema);
    expect(AdditionalSchemas.WorkCenterCreate).toBe(WorkCenterCreateSchema);
    expect(AdditionalSchemas.OEEQuery).toBe(OEEQuerySchema);
    expect(AdditionalSchemas.OEERecord).toBe(OEERecordSchema);
    expect(AdditionalSchemas.CapacityQuery).toBe(CapacityQuerySchema);
    expect(AdditionalSchemas.AlertQuery).toBe(AlertQuerySchema);
    expect(AdditionalSchemas.AlertCreate).toBe(AlertCreateSchema);
    expect(AdditionalSchemas.ReportQuery).toBe(ReportQuerySchema);
    expect(AdditionalSchemas.CustomerQuery).toBe(CustomerQuerySchema);
    expect(AdditionalSchemas.CustomerCreate).toBe(CustomerCreateSchema);
    expect(AdditionalSchemas.SupplierQuery).toBe(SupplierQuerySchema);
    expect(AdditionalSchemas.SupplierCreate).toBe(SupplierCreateSchema);
    expect(AdditionalSchemas.AIChat).toBe(AIChatSchema);
    expect(AdditionalSchemas.MobileInventoryAction).toBe(MobileInventoryActionSchema);
    expect(AdditionalSchemas.MobileQuality).toBe(MobileQualitySchema);
    expect(AdditionalSchemas.TechnicianQuery).toBe(TechnicianQuerySchema);
    expect(AdditionalSchemas.DashboardQuery).toBe(DashboardQuerySchema);
    expect(AdditionalSchemas.MRPRun).toBe(MRPRunSchema);
    expect(AdditionalSchemas.PartQuery).toBe(PartQuerySchema);
    expect(AdditionalSchemas.PartCreate).toBe(PartCreateSchema);
    expect(AdditionalSchemas.InventoryQuery).toBe(InventoryQuerySchema);
    expect(AdditionalSchemas.InventoryAdjust).toBe(InventoryAdjustSchema);
    expect(AdditionalSchemas.SalesOrderQuery).toBe(SalesOrderQuerySchema);
    expect(AdditionalSchemas.SalesOrderCreate).toBe(SalesOrderCreateSchema);
    expect(AdditionalSchemas.WorkOrderQuery).toBe(WorkOrderQuerySchema);
    expect(AdditionalSchemas.WorkOrderCreate).toBe(WorkOrderCreateSchema);
  });
});
