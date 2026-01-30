/**
 * Seed Default Workflow Templates
 * Run with: npx ts-node prisma/seed-workflows.ts
 * Or integrate into main seed file
 */

import { PrismaClient, WorkflowEntityType, WorkflowStepType, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface WorkflowStepSeed {
  stepNumber: number;
  name: string;
  type: WorkflowStepType;
  approverRole: string;
  slaHours: number;
  autoEscalate?: boolean;
  escalateTo?: string;
  isRequired: boolean;
  conditions?: Record<string, unknown>;
}

interface WorkflowSeed {
  name: string;
  code: string;
  description: string;
  entityType: WorkflowEntityType;
  defaultSlaHours: number;
  escalationEnabled: boolean;
  triggerConditions: Record<string, unknown> | null;
  steps: WorkflowStepSeed[];
}

const defaultWorkflows: WorkflowSeed[] = [
  {
    name: 'Purchase Order Approval',
    code: 'PO_APPROVAL',
    description: 'Standard approval workflow for purchase orders based on amount thresholds',
    entityType: 'PURCHASE_ORDER' as WorkflowEntityType,
    defaultSlaHours: 48,
    escalationEnabled: true,
    triggerConditions: { amount_gt: 0 },
    steps: [
      {
        stepNumber: 1,
        name: 'Manager Approval',
        type: 'APPROVAL' as WorkflowStepType,
        approverRole: 'manager',
        slaHours: 24,
        autoEscalate: true,
        escalateTo: 'director',
        isRequired: true,
        conditions: { amount_gt: 0 },
      },
      {
        stepNumber: 2,
        name: 'Director Approval',
        type: 'APPROVAL' as WorkflowStepType,
        approverRole: 'director',
        slaHours: 24,
        autoEscalate: false,
        isRequired: true,
        conditions: { amount_gt: 10000 },
      },
      {
        stepNumber: 3,
        name: 'Finance Review',
        type: 'REVIEW' as WorkflowStepType,
        approverRole: 'finance',
        slaHours: 24,
        isRequired: true,
        conditions: { amount_gt: 50000 },
      },
    ],
  },
  {
    name: 'NCR Review',
    code: 'NCR_REVIEW',
    description: 'Non-Conformance Report review and disposition workflow',
    entityType: 'NCR' as WorkflowEntityType,
    defaultSlaHours: 72,
    escalationEnabled: true,
    triggerConditions: null,
    steps: [
      {
        stepNumber: 1,
        name: 'QA Review',
        type: 'REVIEW' as WorkflowStepType,
        approverRole: 'qa',
        slaHours: 24,
        autoEscalate: true,
        escalateTo: 'qa_manager',
        isRequired: true,
      },
      {
        stepNumber: 2,
        name: 'Engineering Review',
        type: 'REVIEW' as WorkflowStepType,
        approverRole: 'engineering',
        slaHours: 24,
        isRequired: true,
      },
      {
        stepNumber: 3,
        name: 'Disposition Approval',
        type: 'APPROVAL' as WorkflowStepType,
        approverRole: 'qa_manager',
        slaHours: 24,
        isRequired: true,
      },
    ],
  },
  {
    name: 'CAPA Approval',
    code: 'CAPA_APPROVAL',
    description: 'Corrective and Preventive Action approval workflow',
    entityType: 'CAPA' as WorkflowEntityType,
    defaultSlaHours: 120,
    escalationEnabled: true,
    triggerConditions: null,
    steps: [
      {
        stepNumber: 1,
        name: 'Root Cause Review',
        type: 'REVIEW' as WorkflowStepType,
        approverRole: 'qa',
        slaHours: 48,
        isRequired: true,
      },
      {
        stepNumber: 2,
        name: 'Action Plan Approval',
        type: 'APPROVAL' as WorkflowStepType,
        approverRole: 'qa_manager',
        slaHours: 24,
        autoEscalate: true,
        escalateTo: 'operations_director',
        isRequired: true,
      },
      {
        stepNumber: 3,
        name: 'Effectiveness Verification',
        type: 'APPROVAL' as WorkflowStepType,
        approverRole: 'qa_manager',
        slaHours: 48,
        isRequired: true,
      },
    ],
  },
  {
    name: 'Work Order Release',
    code: 'WO_RELEASE',
    description: 'Work order release and authorization workflow',
    entityType: 'WORK_ORDER' as WorkflowEntityType,
    defaultSlaHours: 24,
    escalationEnabled: true,
    triggerConditions: null,
    steps: [
      {
        stepNumber: 1,
        name: 'Material Check',
        type: 'REVIEW' as WorkflowStepType,
        approverRole: 'warehouse',
        slaHours: 8,
        isRequired: true,
      },
      {
        stepNumber: 2,
        name: 'Production Approval',
        type: 'APPROVAL' as WorkflowStepType,
        approverRole: 'production_manager',
        slaHours: 8,
        autoEscalate: true,
        escalateTo: 'operations_director',
        isRequired: true,
      },
    ],
  },
  {
    name: 'Sales Order Approval',
    code: 'SO_APPROVAL',
    description: 'Sales order credit and discount approval workflow',
    entityType: 'SALES_ORDER' as WorkflowEntityType,
    defaultSlaHours: 24,
    escalationEnabled: true,
    triggerConditions: { discount_gt: 10 },
    steps: [
      {
        stepNumber: 1,
        name: 'Sales Manager Approval',
        type: 'APPROVAL' as WorkflowStepType,
        approverRole: 'sales_manager',
        slaHours: 8,
        isRequired: true,
        conditions: { discount_gt: 10 },
      },
      {
        stepNumber: 2,
        name: 'Credit Check',
        type: 'REVIEW' as WorkflowStepType,
        approverRole: 'finance',
        slaHours: 8,
        isRequired: true,
        conditions: { amount_gt: 50000 },
      },
    ],
  },
  {
    name: 'Inventory Adjustment',
    code: 'INV_ADJUSTMENT',
    description: 'Inventory adjustment approval workflow',
    entityType: 'INVENTORY_ADJUSTMENT' as WorkflowEntityType,
    defaultSlaHours: 48,
    escalationEnabled: true,
    triggerConditions: { value_gt: 1000 },
    steps: [
      {
        stepNumber: 1,
        name: 'Warehouse Manager Approval',
        type: 'APPROVAL' as WorkflowStepType,
        approverRole: 'warehouse_manager',
        slaHours: 24,
        isRequired: true,
      },
      {
        stepNumber: 2,
        name: 'Finance Review',
        type: 'REVIEW' as WorkflowStepType,
        approverRole: 'finance',
        slaHours: 24,
        isRequired: true,
        conditions: { value_gt: 10000 },
      },
    ],
  },
  {
    name: 'Engineering Change',
    code: 'ECO_APPROVAL',
    description: 'Engineering Change Order approval workflow',
    entityType: 'ENGINEERING_CHANGE' as WorkflowEntityType,
    defaultSlaHours: 168, // 1 week
    escalationEnabled: true,
    triggerConditions: null,
    steps: [
      {
        stepNumber: 1,
        name: 'Engineering Review',
        type: 'REVIEW' as WorkflowStepType,
        approverRole: 'engineering_manager',
        slaHours: 48,
        isRequired: true,
      },
      {
        stepNumber: 2,
        name: 'Production Impact Review',
        type: 'REVIEW' as WorkflowStepType,
        approverRole: 'production_manager',
        slaHours: 24,
        isRequired: true,
      },
      {
        stepNumber: 3,
        name: 'Quality Review',
        type: 'REVIEW' as WorkflowStepType,
        approverRole: 'qa_manager',
        slaHours: 24,
        isRequired: true,
      },
      {
        stepNumber: 4,
        name: 'Final Approval',
        type: 'APPROVAL' as WorkflowStepType,
        approverRole: 'operations_director',
        slaHours: 48,
        isRequired: true,
      },
    ],
  },
];

async function seedWorkflows() {
  console.log('Seeding default workflow templates...');

  for (const workflowData of defaultWorkflows) {
    const { steps, ...workflow } = workflowData;

    // Check if workflow already exists
    const existing = await prisma.workflowDefinition.findUnique({
      where: { code: workflow.code },
    });

    if (existing) {
      console.log(`Workflow ${workflow.code} already exists, skipping...`);
      continue;
    }

    // Create workflow with steps
    const created = await prisma.workflowDefinition.create({
      data: {
        name: workflow.name,
        code: workflow.code,
        description: workflow.description,
        entityType: workflow.entityType,
        defaultSlaHours: workflow.defaultSlaHours,
        escalationEnabled: workflow.escalationEnabled,
        triggerConditions: workflow.triggerConditions === null
          ? Prisma.JsonNull
          : (workflow.triggerConditions as Prisma.InputJsonValue),
        steps: {
          create: steps.map((step) => ({
            stepNumber: step.stepNumber,
            name: step.name,
            type: step.type,
            approverRole: step.approverRole,
            slaHours: step.slaHours,
            autoEscalate: step.autoEscalate || false,
            escalateTo: step.escalateTo,
            isRequired: step.isRequired,
            conditions: step.conditions
              ? (step.conditions as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          })),
        },
      },
      include: {
        steps: true,
      },
    });

    console.log(`Created workflow: ${created.name} (${created.code}) with ${created.steps.length} steps`);
  }

  console.log('Workflow seeding complete!');
}

// Run if called directly
seedWorkflows()
  .catch((e) => {
    console.error('Error seeding workflows:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export { seedWorkflows };
