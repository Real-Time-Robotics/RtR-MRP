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
      { id: 'info', name: 'Thông tin', description: 'Thông tin cơ bản' },
      { id: 'items', name: 'Line Items', description: 'Thêm sản phẩm' },
      { id: 'approval', name: 'Phê duyệt', description: 'Gửi để phê duyệt' },
      { id: 'delivery', name: 'Giao hàng', description: 'Chờ nhận hàng' },
      { id: 'complete', name: 'Hoàn thành', description: 'Đã nhận hàng' },
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
      if (currentStep === 1) return 'Thêm line items vào PO';
      if (currentStep === 2) return 'Gửi PO để phê duyệt';
      if (currentStep === 3) return 'Chờ xác nhận từ supplier';
      if (currentStep === 4) return 'Chờ nhận hàng từ supplier';
      return null;
    },
  },

  SO: {
    entityType: 'SO',
    steps: [
      { id: 'create', name: 'Tạo đơn', description: 'Tạo đơn hàng' },
      { id: 'confirm', name: 'Xác nhận', description: 'Xác nhận đơn hàng' },
      { id: 'shipping', name: 'Xuất kho', description: 'Xuất kho giao hàng' },
      { id: 'delivery', name: 'Giao hàng', description: 'Giao hàng cho khách' },
      { id: 'complete', name: 'Hoàn thành', description: 'Đơn hàng hoàn tất' },
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
      if (currentStep === 1) return 'Thêm sản phẩm và xác nhận đơn hàng';
      if (currentStep === 2) return 'Xác nhận và chuẩn bị xuất kho';
      if (currentStep === 3) {
        const lines = so.lines as Array<{ shippedQty?: number; quantity?: number }> | undefined;
        const unshipped = lines?.filter(l => (l.shippedQty || 0) < (l.quantity || 0)).length || 0;
        if (unshipped > 0) return `Còn ${unshipped} dòng chưa xuất kho`;
        return 'Xuất kho và tạo shipment';
      }
      if (currentStep === 4) return 'Xác nhận giao hàng thành công';
      return null;
    },
  },

  MRP_RUN: {
    entityType: 'MRP_RUN',
    steps: [
      { id: 'results', name: 'Kết quả', description: 'Xem kết quả MRP' },
      { id: 'review', name: 'Review', description: 'Duyệt suggestions' },
      { id: 'complete', name: 'Hoàn thành', description: 'Đã xử lý hết' },
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
      if (currentStep === 1) return 'Review các suggestions';
      if (currentStep === 2) {
        const suggestions = run.suggestions as Array<{ status?: string }> | undefined;
        const pending = suggestions?.filter(s => s.status === 'pending').length || 0;
        return `Còn ${pending} suggestions cần review`;
      }
      return null;
    },
  },

  WORK_ORDER: {
    entityType: 'WORK_ORDER',
    steps: [
      { id: 'created', name: 'Tạo', description: 'WO đã tạo' },
      { id: 'materials', name: 'Vật tư', description: 'Chuẩn bị vật tư' },
      { id: 'production', name: 'Sản xuất', description: 'Đang sản xuất' },
      { id: 'complete', name: 'Hoàn thành', description: 'Đã hoàn thành' },
      { id: 'receive', name: 'Nhập kho', description: 'Nhập kho thành phẩm' },
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
      if (currentStep === 1) return 'Release WO và allocate vật tư';
      if (currentStep === 2) return 'Bắt đầu sản xuất';
      if (currentStep === 3) {
        const completedQty = Number(wo.completedQty || 0);
        const quantity = Number(wo.quantity || 0);
        const progress = quantity > 0 ? Math.round((completedQty / quantity) * 100) : 0;
        return `Tiến độ: ${progress}% - Hoàn thành để nhập kho`;
      }
      if (currentStep === 4) return 'Nhập kho thành phẩm';
      return null;
    },
  },
};

export function getWorkflowDefinition(entityType: string): WorkflowDefinition | null {
  return WORKFLOW_DEFINITIONS[entityType] || null;
}
