// Workflow Automation Module Exports
export { WorkflowEngine, workflowEngine } from './workflow-engine';
export { NotificationService, notificationService } from './notification-service';

// Workflow Triggers - for entity creation integration
export {
  triggerPurchaseOrderWorkflow,
  triggerNCRWorkflow,
  triggerCAPAWorkflow,
  triggerWorkOrderWorkflow,
  triggerSalesOrderWorkflow,
  triggerInventoryAdjustmentWorkflow,
  triggerEngineeringChangeWorkflow,
  triggerWorkflow,
} from './workflow-triggers';

export type {
  StartWorkflowParams,
  ApproveStepParams,
  RejectStepParams,
  DelegateParams,
  WorkflowResult,
} from './workflow-engine';

export type {
  NotificationPayload,
  BulkNotificationPayload,
} from './notification-service';
