// src/lib/workflow/workflow-definitions.ts
// Workflow step definitions for entity types

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
}

export interface WorkflowDefinition {
  entityType: string;
  steps: WorkflowStep[];
  detectCurrentStep: (data: Record<string, unknown>) => number;
  getNextStepHint: (data: Record<string, unknown>, currentStep: number) => string | null;
}

export const WORKFLOW_DEFINITIONS: Record<string, WorkflowDefinition> = {
  PO: {
    entityType: 'PO',
    steps: [
      { id: 'info', name: 'Thong tin', description: 'Thong tin co ban' },
      { id: 'items', name: 'Line Items', description: 'Them san pham' },
      { id: 'approval', name: 'Phe duyet', description: 'Gui de phe duyet' },
      { id: 'delivery', name: 'Giao hang', description: 'Cho nhan hang' },
      { id: 'complete', name: 'Hoan thanh', description: 'Da nhan hang' },
    ],
    detectCurrentStep: (po) => {
      const status = String(po.status || '').toLowerCase();
      if (status === 'received' || status === 'completed') return 5;
      if (status === 'in_progress') return 4;
      if (status === 'confirmed') return 4;
      if (status === 'pending') return 3;
      const lines = po.lines as Array<unknown> | undefined;
      if (lines && lines.length > 0) return 2;
      return 1;
    },
    getNextStepHint: (po, currentStep) => {
      const status = String(po.status || '').toLowerCase();
      if (currentStep === 1) return 'Them line items vao PO';
      if (currentStep === 2) return 'Gui PO de phe duyet';
      if (currentStep === 3) return 'Cho xac nhan tu supplier';
      if (currentStep === 4) return 'Cho nhan hang tu supplier';
      return null;
    },
  },

  SO: {
    entityType: 'SO',
    steps: [
      { id: 'create', name: 'Tao don', description: 'Tao don hang' },
      { id: 'confirm', name: 'Xac nhan', description: 'Xac nhan don hang' },
      { id: 'shipping', name: 'Xuat kho', description: 'Xuat kho giao hang' },
      { id: 'delivery', name: 'Giao hang', description: 'Giao hang cho khach' },
      { id: 'complete', name: 'Hoan thanh', description: 'Don hang hoan tat' },
    ],
    detectCurrentStep: (so) => {
      const status = String(so.status || '').toLowerCase();
      if (status === 'delivered' || status === 'completed') return 5;
      if (status === 'shipped' || status === 'partially_shipped') return 4;
      if (status === 'in_progress' || status === 'completed') return 3;
      if (status === 'confirmed') return 3;
      if (status === 'pending' || status === 'processing') return 2;
      return 1;
    },
    getNextStepHint: (so, currentStep) => {
      if (currentStep === 1) return 'Them san pham va xac nhan don hang';
      if (currentStep === 2) return 'Xac nhan va chuan bi xuat kho';
      if (currentStep === 3) {
        const lines = so.lines as Array<{ shippedQty?: number; quantity?: number }> | undefined;
        const unshipped = lines?.filter(l => (l.shippedQty || 0) < (l.quantity || 0)).length || 0;
        if (unshipped > 0) return `Con ${unshipped} dong chua xuat kho`;
        return 'Xuat kho va tao shipment';
      }
      if (currentStep === 4) return 'Xac nhan giao hang thanh cong';
      return null;
    },
  },

  MRP_RUN: {
    entityType: 'MRP_RUN',
    steps: [
      { id: 'results', name: 'Ket qua', description: 'Xem ket qua MRP' },
      { id: 'review', name: 'Review', description: 'Duyet suggestions' },
      { id: 'complete', name: 'Hoan thanh', description: 'Da xu ly het' },
    ],
    detectCurrentStep: (run) => {
      const suggestions = run.suggestions as Array<{ status?: string }> | undefined;
      const total = suggestions?.length || 0;
      const reviewed = suggestions?.filter(s => s.status !== 'pending').length || 0;
      if (reviewed === total && total > 0) return 3;
      if (reviewed > 0) return 2;
      return 1;
    },
    getNextStepHint: (run, currentStep) => {
      if (currentStep === 1) return 'Review cac suggestions';
      if (currentStep === 2) {
        const suggestions = run.suggestions as Array<{ status?: string }> | undefined;
        const pending = suggestions?.filter(s => s.status === 'pending').length || 0;
        return `Con ${pending} suggestions can review`;
      }
      return null;
    },
  },

  WORK_ORDER: {
    entityType: 'WORK_ORDER',
    steps: [
      { id: 'created', name: 'Tao', description: 'WO da tao' },
      { id: 'materials', name: 'Vat tu', description: 'Chuan bi vat tu' },
      { id: 'production', name: 'San xuat', description: 'Dang san xuat' },
      { id: 'complete', name: 'Hoan thanh', description: 'Da hoan thanh' },
      { id: 'receive', name: 'Nhap kho', description: 'Nhap kho thanh pham' },
    ],
    detectCurrentStep: (wo) => {
      const status = String(wo.status || '').toLowerCase();
      if (status === 'closed') return 5;
      if (status === 'completed') return 4;
      if (status === 'in_progress' || status === 'on_hold') return 3;
      if (status === 'released') return 2;
      return 1;
    },
    getNextStepHint: (wo, currentStep) => {
      const status = String(wo.status || '').toLowerCase();
      if (currentStep === 1) return 'Release WO va allocate vat tu';
      if (currentStep === 2) return 'Bat dau san xuat';
      if (currentStep === 3) {
        const completedQty = Number(wo.completedQty || 0);
        const quantity = Number(wo.quantity || 0);
        const progress = quantity > 0 ? Math.round((completedQty / quantity) * 100) : 0;
        return `Tien do: ${progress}% - Hoan thanh de nhap kho`;
      }
      if (currentStep === 4) return 'Nhap kho thanh pham';
      return null;
    },
  },
};

export function getWorkflowDefinition(entityType: string): WorkflowDefinition | null {
  return WORKFLOW_DEFINITIONS[entityType] || null;
}
