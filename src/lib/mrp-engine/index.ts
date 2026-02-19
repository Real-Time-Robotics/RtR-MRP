/**
 * MRP Engine - Barrel File
 * Re-exports all functions and types from sub-modules.
 * This ensures backward compatibility for existing imports from "@/lib/mrp-engine".
 */

// Types
export type { MrpParams, PartRequirement, MrpSuggestionData } from "./types";

// MRP Run Orchestration
export { runMrpCalculation } from "./mrp-run";

// Suggestion Management
export { approveSuggestion, rejectSuggestion } from "./suggestion-management";

// Work Order Management
export { createWorkOrder, updateWorkOrderStatus } from "./work-order";

// Material Allocation
export { regenerateAllocations, allocateMaterials } from "./material-allocation";

// Material Issuance
export { issueMaterials, issueAdHocMaterials } from "./material-issuance";

// Production Receipt
export {
  receiveProductionOutput,
  confirmProductionReceipt,
  rejectProductionReceipt,
} from "./production-receipt";

// Shipment Creation & Picking
export { createShipment, pickForShipment } from "./shipment-creation";

// Shipment Fulfillment & Delivery
export { confirmShipment, confirmDelivery } from "./shipment-fulfillment";
