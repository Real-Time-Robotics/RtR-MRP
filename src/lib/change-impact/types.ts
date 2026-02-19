/**
 * Change Impact Tracking - Core Types
 * Defines types for tracking how changes to one entity affect related entities
 */

// Entity types that can be impacted by changes
export type ImpactableEntity =
  | 'part'
  | 'bom'
  | 'bomLine'
  | 'inventory'
  | 'workOrder'
  | 'purchaseOrder'
  | 'poLine'
  | 'salesOrder'
  | 'soLine'
  | 'supplier'
  | 'customer';

// Value types for proper formatting
export type ValueType = 'number' | 'string' | 'currency' | 'date' | 'percentage' | 'boolean';

// Represents a single field change
export interface FieldChange {
  field: string;
  fieldLabel: string;
  oldValue: unknown;
  newValue: unknown;
  valueType: ValueType;
}

// Represents an item that will be affected by changes
export interface ImpactedItem {
  id: string;
  entity: ImpactableEntity;
  entityCode: string;
  entityName: string;
  relationship: string;
  changes: FieldChange[];
  navigationUrl?: string;
  canNavigate: boolean;
}

// Result of impact calculation
export interface ChangeImpactResult {
  sourceEntity: ImpactableEntity;
  sourceId: string;
  sourceCode: string;
  changes: FieldChange[];
  impactedItems: ImpactedItem[];
  totalImpactedCount: number;
  calculatedAt: Date;
}

// Request to calculate impact
export interface ChangeImpactRequest {
  entity: ImpactableEntity;
  entityId: string;
  changes: FieldChange[];
}

// API response
export interface ChangeImpactResponse {
  success: boolean;
  data?: ChangeImpactResult;
  error?: string;
}

// Field impact rule - defines how a field change propagates
export interface FieldImpactRule {
  sourceField: string;
  sourceFieldLabel: string;
  targetEntity: ImpactableEntity;
  targetField: string;
  targetFieldLabel: string;
  valueType: ValueType;
  calculateImpact: (oldValue: unknown, newValue: unknown, context: Record<string, unknown>) => FieldChange | null;
}

// Entity relationship definition
export interface EntityRelationship {
  sourceEntity: ImpactableEntity;
  targetEntity: ImpactableEntity;
  relationship: string;
  prismaInclude: string;
  getNavigationUrl: (targetId: string) => string;
}
