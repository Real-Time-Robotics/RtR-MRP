import { describe, it, expect } from 'vitest';
import {
  AlertType,
  AlertPriority,
  AlertSource,
  AlertStatus,
  AlertActionType,
  PRIORITY_RULES,
  getPriorityColor,
  getPriorityLabel,
  getSourceLabel,
  getTypeLabel,
  StockoutAlertData,
  QualityAlertData,
  SupplierAlertData,
  POAlertData,
  ScheduleAlertData,
} from '../alert-types';

// =============================================================================
// ENUMS
// =============================================================================

describe('AlertType enum', () => {
  it('has all inventory alert types', () => {
    expect(AlertType.STOCKOUT).toBe('STOCKOUT');
    expect(AlertType.REORDER).toBe('REORDER');
    expect(AlertType.SAFETY_STOCK_LOW).toBe('SAFETY_STOCK_LOW');
  });

  it('has all quality alert types', () => {
    expect(AlertType.QUALITY_CRITICAL).toBe('QUALITY_CRITICAL');
    expect(AlertType.QUALITY_DRIFT).toBe('QUALITY_DRIFT');
    expect(AlertType.QUALITY_RISK).toBe('QUALITY_RISK');
  });

  it('has all supplier alert types', () => {
    expect(AlertType.SUPPLIER_RISK).toBe('SUPPLIER_RISK');
    expect(AlertType.SUPPLIER_DELIVERY).toBe('SUPPLIER_DELIVERY');
    expect(AlertType.SUPPLIER_QUALITY).toBe('SUPPLIER_QUALITY');
  });

  it('has all PO alert types', () => {
    expect(AlertType.PO_PENDING).toBe('PO_PENDING');
    expect(AlertType.PO_EXPIRED).toBe('PO_EXPIRED');
    expect(AlertType.PO_EXECUTED).toBe('PO_EXECUTED');
  });

  it('has all schedule alert types', () => {
    expect(AlertType.SCHEDULE_CONFLICT).toBe('SCHEDULE_CONFLICT');
    expect(AlertType.DEADLINE_RISK).toBe('DEADLINE_RISK');
    expect(AlertType.SCHEDULE_OPTIMIZED).toBe('SCHEDULE_OPTIMIZED');
  });

  it('has all system alert types', () => {
    expect(AlertType.SYSTEM_ERROR).toBe('SYSTEM_ERROR');
    expect(AlertType.SYSTEM_INFO).toBe('SYSTEM_INFO');
  });

  it('has simulation alert types', () => {
    expect(AlertType.SIMULATION_THRESHOLD).toBe('SIMULATION_THRESHOLD');
    expect(AlertType.SIMULATION_COMPLETE).toBe('SIMULATION_COMPLETE');
  });
});

describe('AlertPriority enum', () => {
  it('has all priority levels', () => {
    expect(AlertPriority.CRITICAL).toBe('CRITICAL');
    expect(AlertPriority.HIGH).toBe('HIGH');
    expect(AlertPriority.MEDIUM).toBe('MEDIUM');
    expect(AlertPriority.LOW).toBe('LOW');
  });
});

describe('AlertSource enum', () => {
  it('has all sources', () => {
    expect(AlertSource.FORECAST).toBe('FORECAST');
    expect(AlertSource.QUALITY).toBe('QUALITY');
    expect(AlertSource.SUPPLIER_RISK).toBe('SUPPLIER_RISK');
    expect(AlertSource.AUTO_PO).toBe('AUTO_PO');
    expect(AlertSource.AUTO_SCHEDULE).toBe('AUTO_SCHEDULE');
    expect(AlertSource.SIMULATION).toBe('SIMULATION');
    expect(AlertSource.SYSTEM).toBe('SYSTEM');
  });
});

describe('AlertStatus enum', () => {
  it('has all statuses', () => {
    expect(AlertStatus.ACTIVE).toBe('ACTIVE');
    expect(AlertStatus.READ).toBe('READ');
    expect(AlertStatus.DISMISSED).toBe('DISMISSED');
    expect(AlertStatus.RESOLVED).toBe('RESOLVED');
    expect(AlertStatus.EXPIRED).toBe('EXPIRED');
    expect(AlertStatus.ESCALATED).toBe('ESCALATED');
  });
});

describe('AlertActionType enum', () => {
  it('has all action types', () => {
    expect(AlertActionType.NAVIGATE).toBe('NAVIGATE');
    expect(AlertActionType.APPROVE).toBe('APPROVE');
    expect(AlertActionType.REJECT).toBe('REJECT');
    expect(AlertActionType.APPLY).toBe('APPLY');
    expect(AlertActionType.CREATE).toBe('CREATE');
    expect(AlertActionType.CONTACT).toBe('CONTACT');
    expect(AlertActionType.VIEW_DETAILS).toBe('VIEW_DETAILS');
    expect(AlertActionType.SNOOZE).toBe('SNOOZE');
    expect(AlertActionType.DISMISS).toBe('DISMISS');
  });
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

describe('getPriorityColor', () => {
  it('returns red for CRITICAL', () => {
    expect(getPriorityColor(AlertPriority.CRITICAL)).toBe('red');
  });

  it('returns orange for HIGH', () => {
    expect(getPriorityColor(AlertPriority.HIGH)).toBe('orange');
  });

  it('returns yellow for MEDIUM', () => {
    expect(getPriorityColor(AlertPriority.MEDIUM)).toBe('yellow');
  });

  it('returns green for LOW', () => {
    expect(getPriorityColor(AlertPriority.LOW)).toBe('green');
  });

  it('returns gray for unknown priority', () => {
    expect(getPriorityColor('UNKNOWN' as AlertPriority)).toBe('gray');
  });
});

describe('getPriorityLabel', () => {
  it('returns Vietnamese labels', () => {
    expect(getPriorityLabel(AlertPriority.CRITICAL)).toBe('Khẩn cấp');
    expect(getPriorityLabel(AlertPriority.HIGH)).toBe('Cao');
    expect(getPriorityLabel(AlertPriority.MEDIUM)).toBe('Trung bình');
    expect(getPriorityLabel(AlertPriority.LOW)).toBe('Thấp');
  });

  it('returns fallback for unknown', () => {
    expect(getPriorityLabel('UNKNOWN' as AlertPriority)).toBe('Không xác định');
  });
});

describe('getSourceLabel', () => {
  it('returns Vietnamese labels for all sources', () => {
    expect(getSourceLabel(AlertSource.FORECAST)).toBe('Dự báo');
    expect(getSourceLabel(AlertSource.QUALITY)).toBe('Chất lượng');
    expect(getSourceLabel(AlertSource.SUPPLIER_RISK)).toBe('Rủi ro NCC');
    expect(getSourceLabel(AlertSource.AUTO_PO)).toBe('Đặt hàng tự động');
    expect(getSourceLabel(AlertSource.AUTO_SCHEDULE)).toBe('Lịch trình tự động');
    expect(getSourceLabel(AlertSource.SIMULATION)).toBe('Mô phỏng');
    expect(getSourceLabel(AlertSource.SYSTEM)).toBe('Hệ thống');
  });

  it('returns fallback for unknown source', () => {
    expect(getSourceLabel('UNKNOWN' as AlertSource)).toBe('Khác');
  });
});

describe('getTypeLabel', () => {
  it('returns Vietnamese label for stockout', () => {
    expect(getTypeLabel(AlertType.STOCKOUT)).toBe('Sắp hết hàng');
  });

  it('returns Vietnamese label for quality critical', () => {
    expect(getTypeLabel(AlertType.QUALITY_CRITICAL)).toBe('Lỗi chất lượng nghiêm trọng');
  });

  it('returns Vietnamese label for PO types', () => {
    expect(getTypeLabel(AlertType.PO_PENDING)).toBe('PO chờ duyệt');
    expect(getTypeLabel(AlertType.PO_EXPIRED)).toBe('PO hết hạn');
    expect(getTypeLabel(AlertType.PO_EXECUTED)).toBe('PO đã thực hiện');
  });

  it('returns Vietnamese label for schedule types', () => {
    expect(getTypeLabel(AlertType.SCHEDULE_CONFLICT)).toBe('Xung đột lịch trình');
    expect(getTypeLabel(AlertType.DEADLINE_RISK)).toBe('Rủi ro trễ deadline');
  });

  it('returns Vietnamese labels for all alert types', () => {
    const allTypes = Object.values(AlertType);
    for (const type of allTypes) {
      const label = getTypeLabel(type);
      expect(label).toBeTruthy();
      expect(typeof label).toBe('string');
    }
  });

  it('returns the type string for unknown types', () => {
    expect(getTypeLabel('UNKNOWN_TYPE' as AlertType)).toBe('UNKNOWN_TYPE');
  });
});

// =============================================================================
// PRIORITY RULES
// =============================================================================

describe('PRIORITY_RULES', () => {
  it('has rules for all alert types', () => {
    const allTypes = Object.values(AlertType);
    for (const type of allTypes) {
      expect(PRIORITY_RULES[type]).toBeDefined();
      expect(PRIORITY_RULES[type].default).toBeDefined();
      expect(Array.isArray(PRIORITY_RULES[type].conditions)).toBe(true);
    }
  });

  it('STOCKOUT defaults to CRITICAL', () => {
    expect(PRIORITY_RULES[AlertType.STOCKOUT].default).toBe(AlertPriority.CRITICAL);
  });

  it('PO_EXECUTED defaults to LOW', () => {
    expect(PRIORITY_RULES[AlertType.PO_EXECUTED].default).toBe(AlertPriority.LOW);
  });

  it('SYSTEM_ERROR defaults to HIGH', () => {
    expect(PRIORITY_RULES[AlertType.SYSTEM_ERROR].default).toBe(AlertPriority.HIGH);
  });

  describe('STOCKOUT conditions', () => {
    it('returns CRITICAL for daysOfSupply <= 3', () => {
      const data: StockoutAlertData = {
        partId: 'p1',
        partNumber: 'PRT-001',
        partName: 'Test Part',
        currentStock: 5,
        daysOfSupply: 2,
        reorderPoint: 10,
        safetyStock: 5,
        demandRate: 3,
      };
      const criticalCondition = PRIORITY_RULES[AlertType.STOCKOUT].conditions[0];
      expect(criticalCondition.priority).toBe(AlertPriority.CRITICAL);
      expect(criticalCondition.condition(data)).toBe(true);
    });

    it('returns HIGH for daysOfSupply <= 7', () => {
      const data: StockoutAlertData = {
        partId: 'p1',
        partNumber: 'PRT-001',
        partName: 'Test Part',
        currentStock: 15,
        daysOfSupply: 5,
        reorderPoint: 10,
        safetyStock: 5,
        demandRate: 3,
      };
      const highCondition = PRIORITY_RULES[AlertType.STOCKOUT].conditions[1];
      expect(highCondition.priority).toBe(AlertPriority.HIGH);
      expect(highCondition.condition(data)).toBe(true);
    });
  });

  describe('QUALITY_CRITICAL conditions', () => {
    it('returns CRITICAL for cpk < 1.0', () => {
      const data: QualityAlertData = {
        partId: 'p1',
        partNumber: 'PRT-001',
        partName: 'Test Part',
        riskScore: 80,
        cpk: 0.8,
        trend: 'declining',
      };
      const condition = PRIORITY_RULES[AlertType.QUALITY_CRITICAL].conditions[0];
      expect(condition.condition(data)).toBe(true);
    });
  });

  describe('SUPPLIER_RISK conditions', () => {
    it('returns CRITICAL for critical risk level', () => {
      const data: SupplierAlertData = {
        supplierId: 's1',
        supplierName: 'Supplier A',
        riskScore: 90,
        riskLevel: 'critical',
        riskFactors: ['late delivery'],
      };
      const criticalCondition = PRIORITY_RULES[AlertType.SUPPLIER_RISK].conditions[0];
      expect(criticalCondition.condition(data)).toBe(true);
    });

    it('returns HIGH for high risk level', () => {
      const data: SupplierAlertData = {
        supplierId: 's1',
        supplierName: 'Supplier A',
        riskScore: 70,
        riskLevel: 'high',
        riskFactors: ['quality issues'],
      };
      const highCondition = PRIORITY_RULES[AlertType.SUPPLIER_RISK].conditions[1];
      expect(highCondition.condition(data)).toBe(true);
    });
  });

  describe('SUPPLIER_DELIVERY conditions', () => {
    it('returns CRITICAL for delay > 5 days', () => {
      const data: SupplierAlertData = {
        supplierId: 's1',
        supplierName: 'Supplier A',
        riskScore: 60,
        riskLevel: 'high',
        riskFactors: [],
        delayDays: 7,
      };
      const condition = PRIORITY_RULES[AlertType.SUPPLIER_DELIVERY].conditions[0];
      expect(condition.condition(data)).toBe(true);
    });
  });

  describe('PO_PENDING conditions', () => {
    it('returns HIGH for pending > 24 hours', () => {
      const data: POAlertData = {
        suggestionId: 'sug-1',
        partId: 'p1',
        partNumber: 'PRT-001',
        partName: 'Test Part',
        supplierId: 's1',
        supplierName: 'Supplier A',
        quantity: 100,
        estimatedCost: 50000,
        confidenceScore: 0.9,
        createdAt: new Date(),
        pendingHours: 30,
      };
      const condition = PRIORITY_RULES[AlertType.PO_PENDING].conditions[0];
      expect(condition.condition(data)).toBe(true);
    });
  });

  describe('SCHEDULE_CONFLICT conditions', () => {
    it('returns CRITICAL for overlap conflict', () => {
      const data: ScheduleAlertData = {
        workOrderId: 'wo-1',
        woNumber: 'WO-001',
        productName: 'Test',
        conflictType: 'overlap',
      };
      const condition = PRIORITY_RULES[AlertType.SCHEDULE_CONFLICT].conditions[0];
      expect(condition.condition(data)).toBe(true);
    });
  });

  describe('DEADLINE_RISK conditions', () => {
    it('returns CRITICAL for daysUntilDue <= 2', () => {
      const data: ScheduleAlertData = {
        workOrderId: 'wo-1',
        woNumber: 'WO-001',
        productName: 'Test',
        daysUntilDue: 1,
      };
      const condition = PRIORITY_RULES[AlertType.DEADLINE_RISK].conditions[0];
      expect(condition.condition(data)).toBe(true);
    });
  });

  describe('SCHEDULE_OPTIMIZED conditions', () => {
    it('returns HIGH for optimization potential > 20', () => {
      const data: ScheduleAlertData = {
        workOrderId: 'wo-1',
        woNumber: 'WO-001',
        productName: 'Test',
        optimizationPotential: 25,
      };
      const condition = PRIORITY_RULES[AlertType.SCHEDULE_OPTIMIZED].conditions[0];
      expect(condition.condition(data)).toBe(true);
    });
  });
});
