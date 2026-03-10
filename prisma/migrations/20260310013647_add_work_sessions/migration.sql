-- CreateEnum
CREATE TYPE "ManufacturingStrategy" AS ENUM ('MTS', 'MTO', 'ATO');

-- CreateEnum
CREATE TYPE "PickingStrategy" AS ENUM ('FIFO', 'FEFO', 'ANY');

-- CreateEnum
CREATE TYPE "WorkOrderType" AS ENUM ('DISCRETE', 'BATCH');

-- CreateEnum
CREATE TYPE "MakeOrBuy" AS ENUM ('MAKE', 'BUY', 'BOTH');

-- CreateEnum
CREATE TYPE "ProcurementType" AS ENUM ('STOCK', 'ORDER', 'CONSIGNMENT');

-- CreateEnum
CREATE TYPE "LifecycleStatus" AS ENUM ('DEVELOPMENT', 'PROTOTYPE', 'ACTIVE', 'PHASE_OUT', 'OBSOLETE', 'EOL');

-- CreateEnum
CREATE TYPE "BomType" AS ENUM ('ENGINEERING', 'MANUFACTURING', 'CONFIGURABLE', 'PLANNING', 'SERVICE');

-- CreateEnum
CREATE TYPE "AlternateType" AS ENUM ('FORM_FIT_FUNCTION', 'FUNCTIONAL', 'EMERGENCY', 'APPROVED_VENDOR');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DRAWING', 'DATASHEET', 'SPECIFICATION', 'CERTIFICATE', 'TEST_REPORT', 'MSDS', 'MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "CertificationType" AS ENUM ('ROHS', 'REACH', 'CE', 'UL', 'ISO', 'AS9100', 'ITAR', 'NDAA', 'COC', 'COA', 'OTHER');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "CostCategory" AS ENUM ('MATERIAL', 'LABOR', 'OVERHEAD', 'SUBCONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'VOID');

-- CreateEnum
CREATE TYPE "JournalStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'POSTED', 'VOID');

-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'DELETED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContextType" AS ENUM ('WORK_ORDER', 'BOM', 'PART', 'INVENTORY', 'QC_REPORT', 'MRP_RUN', 'PURCHASE_ORDER', 'SUPPLIER', 'CUSTOMER', 'SALES_ORDER', 'GENERAL');

-- CreateEnum
CREATE TYPE "ThreadStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ThreadPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MentionType" AS ENUM ('USER', 'ROLE');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('IMAGE', 'DOCUMENT', 'FILE');

-- CreateEnum
CREATE TYPE "LinkedEntityType" AS ENUM ('PART', 'BOM', 'WORK_ORDER', 'PURCHASE_ORDER', 'SALES_ORDER', 'SUPPLIER', 'CUSTOMER', 'INVENTORY', 'QC_REPORT', 'MRP_RUN');

-- CreateEnum
CREATE TYPE "WorkflowEntityType" AS ENUM ('PURCHASE_ORDER', 'SALES_ORDER', 'WORK_ORDER', 'NCR', 'CAPA', 'INVENTORY_ADJUSTMENT', 'ENGINEERING_CHANGE');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "WorkflowStepType" AS ENUM ('APPROVAL', 'REVIEW', 'NOTIFICATION', 'CONDITIONAL', 'PARALLEL');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DELEGATED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "WorkSessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "country" TEXT NOT NULL,
    "ndaaCompliant" BOOLEAN NOT NULL DEFAULT true,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "paymentTerms" TEXT,
    "leadTimeDays" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts" (
    "id" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weightKg" DOUBLE PRECISION,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "minStockLevel" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER NOT NULL DEFAULT 0,
    "safetyStock" INTEGER NOT NULL DEFAULT 0,
    "shelfLifeDays" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lengthMm" DOUBLE PRECISION,
    "widthMm" DOUBLE PRECISION,
    "heightMm" DOUBLE PRECISION,
    "volumeCm3" DOUBLE PRECISION,
    "color" TEXT,
    "material" TEXT,
    "subCategory" TEXT,
    "partType" TEXT,
    "makeOrBuy" "MakeOrBuy" NOT NULL DEFAULT 'BUY',
    "procurementType" "ProcurementType" NOT NULL DEFAULT 'STOCK',
    "manufacturingStrategy" "ManufacturingStrategy" NOT NULL DEFAULT 'MTS',
    "pickingStrategy" "PickingStrategy" NOT NULL DEFAULT 'ANY',
    "abcClass" TEXT,
    "buyerCode" TEXT,
    "moq" INTEGER NOT NULL DEFAULT 1,
    "orderMultiple" INTEGER NOT NULL DEFAULT 1,
    "standardPack" INTEGER NOT NULL DEFAULT 1,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 14,
    "countryOfOrigin" TEXT,
    "hsCode" TEXT,
    "eccn" TEXT,
    "ndaaCompliant" BOOLEAN NOT NULL DEFAULT true,
    "itarControlled" BOOLEAN NOT NULL DEFAULT false,
    "lotControl" BOOLEAN NOT NULL DEFAULT false,
    "serialControl" BOOLEAN NOT NULL DEFAULT false,
    "inspectionRequired" BOOLEAN NOT NULL DEFAULT true,
    "inspectionPlan" TEXT,
    "aqlLevel" TEXT,
    "certificateRequired" BOOLEAN NOT NULL DEFAULT false,
    "rohsCompliant" BOOLEAN NOT NULL DEFAULT true,
    "reachCompliant" BOOLEAN NOT NULL DEFAULT true,
    "revision" TEXT NOT NULL DEFAULT 'A',
    "revisionDate" TIMESTAMP(3),
    "drawingNumber" TEXT,
    "drawingUrl" TEXT,
    "datasheetUrl" TEXT,
    "specDocument" TEXT,
    "manufacturerPn" TEXT,
    "manufacturer" TEXT,
    "lifecycleStatus" "LifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectivityDate" TIMESTAMP(3),
    "obsoleteDate" TIMESTAMP(3),
    "standardCost" DOUBLE PRECISION,
    "averageCost" DOUBLE PRECISION,
    "landedCost" DOUBLE PRECISION,
    "freightPercent" DOUBLE PRECISION,
    "dutyPercent" DOUBLE PRECISION,
    "overheadPercent" DOUBLE PRECISION,
    "priceBreakQty1" INTEGER,
    "priceBreakCost1" DOUBLE PRECISION,
    "priceBreakQty2" INTEGER,
    "priceBreakCost2" DOUBLE PRECISION,
    "priceBreakQty3" INTEGER,
    "priceBreakCost3" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_planning" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "minStockLevel" INTEGER NOT NULL DEFAULT 0,
    "maxStock" INTEGER,
    "reorderPoint" INTEGER NOT NULL DEFAULT 0,
    "safetyStock" INTEGER NOT NULL DEFAULT 0,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 14,
    "makeOrBuy" "MakeOrBuy" NOT NULL DEFAULT 'BUY',
    "procurementType" "ProcurementType" NOT NULL DEFAULT 'STOCK',
    "buyerCode" TEXT,
    "plannerCode" TEXT,
    "moq" INTEGER NOT NULL DEFAULT 1,
    "orderMultiple" INTEGER NOT NULL DEFAULT 1,
    "standardPack" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_planning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_costs" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "standardCost" DOUBLE PRECISION,
    "averageCost" DOUBLE PRECISION,
    "landedCost" DOUBLE PRECISION,
    "freightPercent" DOUBLE PRECISION,
    "dutyPercent" DOUBLE PRECISION,
    "overheadPercent" DOUBLE PRECISION,
    "priceBreakQty1" INTEGER,
    "priceBreakCost1" DOUBLE PRECISION,
    "priceBreakQty2" INTEGER,
    "priceBreakCost2" DOUBLE PRECISION,
    "priceBreakQty3" INTEGER,
    "priceBreakCost3" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_specs" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "lengthMm" DOUBLE PRECISION,
    "widthMm" DOUBLE PRECISION,
    "heightMm" DOUBLE PRECISION,
    "volumeCm3" DOUBLE PRECISION,
    "color" TEXT,
    "material" TEXT,
    "finish" TEXT,
    "drawingNumber" TEXT,
    "drawingUrl" TEXT,
    "datasheetUrl" TEXT,
    "specDocument" TEXT,
    "manufacturerPn" TEXT,
    "manufacturer" TEXT,
    "subCategory" TEXT,
    "partType" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_specs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_compliance" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "countryOfOrigin" TEXT,
    "hsCode" TEXT,
    "eccn" TEXT,
    "ndaaCompliant" BOOLEAN NOT NULL DEFAULT true,
    "itarControlled" BOOLEAN NOT NULL DEFAULT false,
    "rohsCompliant" BOOLEAN NOT NULL DEFAULT true,
    "reachCompliant" BOOLEAN NOT NULL DEFAULT true,
    "lotControl" BOOLEAN NOT NULL DEFAULT false,
    "serialControl" BOOLEAN NOT NULL DEFAULT false,
    "inspectionRequired" BOOLEAN NOT NULL DEFAULT true,
    "certificateRequired" BOOLEAN NOT NULL DEFAULT false,
    "shelfLifeDays" INTEGER,
    "aqlLevel" TEXT DEFAULT 'II',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_compliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_suppliers" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierPartNo" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "minOrderQty" INTEGER NOT NULL DEFAULT 1,
    "leadTimeDays" INTEGER NOT NULL,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "orderMultiple" INTEGER NOT NULL DEFAULT 1,
    "qualified" BOOLEAN NOT NULL DEFAULT true,
    "qualificationDate" TIMESTAMP(3),
    "qualificationExpiry" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "receivingTolerance" DOUBLE PRECISION,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_alternates" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "alternatePartId" TEXT NOT NULL,
    "alternateType" "AlternateType" NOT NULL DEFAULT 'FORM_FIT_FUNCTION',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "conversionFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "approved" BOOLEAN NOT NULL DEFAULT true,
    "approvedBy" TEXT,
    "approvalDate" TIMESTAMP(3),
    "effectiveDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_alternates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_documents" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "documentNumber" TEXT,
    "title" TEXT NOT NULL,
    "revision" TEXT NOT NULL DEFAULT 'A',
    "url" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_revisions" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "previousRevision" TEXT,
    "revisionDate" TIMESTAMP(3) NOT NULL,
    "changeType" TEXT,
    "changeReason" TEXT,
    "changeDescription" TEXT,
    "ecrNumber" TEXT,
    "ecoNumber" TEXT,
    "changedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvalDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_costs_history" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "costType" TEXT NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "supplierId" TEXT,
    "poNumber" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_costs_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_certifications" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "certificationType" "CertificationType" NOT NULL,
    "certificateNumber" TEXT,
    "issuingBody" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "documentUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePrice" DOUBLE PRECISION,
    "assemblyHours" DOUBLE PRECISION,
    "testingHours" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "defaultWorkCenterId" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_headers" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bom_headers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_lines" (
    "id" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "partId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "level" INTEGER NOT NULL DEFAULT 1,
    "moduleCode" TEXT,
    "moduleName" TEXT,
    "position" TEXT,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "scrapRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "findNumber" INTEGER,
    "referenceDesignator" TEXT,
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "positionZ" DOUBLE PRECISION,
    "scrapPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "operationSeq" INTEGER,
    "revision" TEXT NOT NULL DEFAULT 'A',
    "effectivityDate" TIMESTAMP(3),
    "obsoleteDate" TIMESTAMP(3),
    "alternateGroup" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "bomType" "BomType" NOT NULL DEFAULT 'MANUFACTURING',
    "subAssembly" BOOLEAN NOT NULL DEFAULT false,
    "phantom" BOOLEAN NOT NULL DEFAULT false,
    "extendedCost" DOUBLE PRECISION,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bom_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "siteId" TEXT,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQty" INTEGER NOT NULL DEFAULT 0,
    "lotNumber" TEXT,
    "locationCode" TEXT,
    "expiryDate" TIMESTAMP(3),
    "lastCountDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "country" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "billingAddress" TEXT,
    "paymentTerms" TEXT,
    "creditLimit" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "requiredDate" TIMESTAMP(3) NOT NULL,
    "promisedDate" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_lines" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineTotal" DOUBLE PRECISION,
    "options" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "shippedQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PREPARING',
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "shippedBy" TEXT,
    "deliveredBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_lines" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "expectedDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_lines" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "partId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "lineTotal" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaMethod" TEXT,
    "mfaSecret" TEXT,
    "mfaBackupCodes" JSONB,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "itarCertified" BOOLEAN NOT NULL DEFAULT false,
    "itarCertifiedAt" TIMESTAMP(3),
    "itarCertifiedBy" TEXT,
    "usPersonStatus" TEXT,
    "notifyOnMention" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnReply" BOOLEAN NOT NULL DEFAULT true,
    "notifyByEmail" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT,
    "notificationSettings" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mrp_runs" (
    "id" TEXT NOT NULL,
    "runNumber" TEXT NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planningHorizon" INTEGER NOT NULL DEFAULT 90,
    "status" TEXT NOT NULL DEFAULT 'running',
    "totalParts" INTEGER,
    "purchaseSuggestions" INTEGER,
    "expediteAlerts" INTEGER,
    "shortageWarnings" INTEGER,
    "parameters" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mrp_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mrp_suggestions" (
    "id" TEXT NOT NULL,
    "mrpRunId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "suggestedQty" INTEGER,
    "suggestedDate" TIMESTAMP(3),
    "currentStock" INTEGER,
    "requiredQty" INTEGER,
    "shortageQty" INTEGER,
    "reason" TEXT,
    "sourceOrderId" TEXT,
    "sourceOrderType" TEXT,
    "supplierId" TEXT,
    "estimatedCost" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "convertedPoId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mrp_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "woNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "salesOrderId" TEXT,
    "salesOrderLine" INTEGER,
    "quantity" INTEGER NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "woType" "WorkOrderType" NOT NULL DEFAULT 'DISCRETE',
    "batchSize" INTEGER,
    "outputLotNumber" TEXT,
    "plannedStart" TIMESTAMP(3),
    "plannedEnd" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "assignedTo" TEXT,
    "workCenter" TEXT,
    "workCenterId" TEXT,
    "notes" TEXT,
    "completedQty" INTEGER NOT NULL DEFAULT 0,
    "scrapQty" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_receipts" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "partId" TEXT,
    "quantity" INTEGER NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_allocations" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "requiredQty" INTEGER NOT NULL,
    "allocatedQty" INTEGER NOT NULL DEFAULT 0,
    "issuedQty" INTEGER NOT NULL DEFAULT 0,
    "returnedQty" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "warehouseId" TEXT,
    "lotNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_forecasts" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "forecastQty" INTEGER NOT NULL,
    "lowerBound" INTEGER NOT NULL,
    "upperBound" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "actualQty" INTEGER,
    "accuracy" DOUBLE PRECISION,
    "model" TEXT NOT NULL DEFAULT 'moving_average',
    "factors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demand_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_time_predictions" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "partId" TEXT,
    "predictedDays" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "minDays" INTEGER NOT NULL,
    "maxDays" INTEGER NOT NULL,
    "factors" JSONB,
    "historicalAvg" DOUBLE PRECISION,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_time_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_risk_scores" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "deliveryScore" INTEGER NOT NULL,
    "qualityScore" INTEGER NOT NULL,
    "financialScore" INTEGER NOT NULL,
    "geographicScore" INTEGER NOT NULL,
    "communicationScore" INTEGER NOT NULL,
    "trend" TEXT NOT NULL,
    "previousScore" INTEGER,
    "strengths" JSONB,
    "risks" JSONB,
    "recommendations" JSONB,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_risk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_recommendations" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" TEXT,
    "savingsEstimate" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION NOT NULL,
    "partId" TEXT,
    "supplierId" TEXT,
    "productId" TEXT,
    "orderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "dismissedAt" TIMESTAMP(3),
    "implementedAt" TIMESTAMP(3),
    "modelVersion" TEXT,
    "factors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ai_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_model_logs" (
    "id" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "runType" TEXT NOT NULL,
    "inputData" JSONB,
    "outputData" JSONB,
    "accuracy" DOUBLE PRECISION,
    "duration" INTEGER,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_model_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailOnOrder" BOOLEAN NOT NULL DEFAULT true,
    "emailOnStock" BOOLEAN NOT NULL DEFAULT true,
    "emailOnPO" BOOLEAN NOT NULL DEFAULT true,
    "emailOnMRP" BOOLEAN NOT NULL DEFAULT false,
    "emailDigest" TEXT NOT NULL DEFAULT 'daily',
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppOnOrder" BOOLEAN NOT NULL DEFAULT true,
    "inAppOnStock" BOOLEAN NOT NULL DEFAULT true,
    "inAppOnPO" BOOLEAN NOT NULL DEFAULT true,
    "inAppOnMRP" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "link" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "mentionedBy" TEXT,
    "mentionedByName" TEXT,
    "threadId" TEXT,
    "messageId" TEXT,
    "contextType" TEXT,
    "contextId" TEXT,
    "contextUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "filters" JSONB NOT NULL,
    "columns" JSONB,
    "visualizations" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "schedule" TEXT,
    "recipients" JSONB,
    "lastRunAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalRows" INTEGER,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "warnings" JSONB,
    "mapping" JSONB,
    "options" JSONB,
    "validationResults" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_rows" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rawData" JSONB NOT NULL,
    "mappedData" JSONB,
    "errors" JSONB,
    "warnings" JSONB,
    "entityId" TEXT,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "filters" JSONB,
    "columns" JSONB,
    "options" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "totalRecords" INTEGER,
    "exportedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "excel_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "columns" JSONB NOT NULL,
    "sampleData" JSONB,
    "instructions" TEXT,
    "validationRules" JSONB,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "excel_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_schedules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourcePath" TEXT,
    "targetType" TEXT,
    "targetPath" TEXT,
    "frequency" TEXT NOT NULL,
    "cronExpression" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "mapping" JSONB,
    "options" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" TEXT,
    "lastRunError" TEXT,
    "nextRunAt" TIMESTAMP(3),
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migration_batches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "sourceSystem" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalEntities" INTEGER NOT NULL DEFAULT 0,
    "processedEntities" INTEGER NOT NULL DEFAULT 0,
    "successEntities" INTEGER NOT NULL DEFAULT 0,
    "errorEntities" INTEGER NOT NULL DEFAULT 0,
    "entityTypes" JSONB,
    "mapping" JSONB,
    "transformations" JSONB,
    "results" JSONB,
    "errors" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "canRollback" BOOLEAN NOT NULL DEFAULT true,
    "rollbackData" JSONB,
    "rolledBackAt" TIMESTAMP(3),
    "rolledBackBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "migration_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_plans" (
    "id" TEXT NOT NULL,
    "planNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "effectiveDate" TIMESTAMP(3),
    "obsoleteDate" TIMESTAMP(3),
    "partId" TEXT,
    "productId" TEXT,
    "supplierId" TEXT,
    "sampleSize" TEXT,
    "sampleMethod" TEXT,
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_characteristics" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "specification" TEXT,
    "nominalValue" DOUBLE PRECISION,
    "upperLimit" DOUBLE PRECISION,
    "lowerLimit" DOUBLE PRECISION,
    "unitOfMeasure" TEXT,
    "acceptanceCriteria" TEXT,
    "referenceDocs" TEXT,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "isMajor" BOOLEAN NOT NULL DEFAULT false,
    "gageRequired" TEXT,
    "subgroupSize" INTEGER,
    "samplingFrequency" TEXT,
    "chartType" TEXT,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_characteristics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "inspectionNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" TEXT,
    "sourceType" TEXT,
    "planId" TEXT,
    "partId" TEXT,
    "productId" TEXT,
    "poLineId" TEXT,
    "workOrderId" TEXT,
    "salesOrderId" TEXT,
    "lotNumber" TEXT,
    "serialNumbers" JSONB,
    "quantityReceived" INTEGER,
    "quantityInspected" INTEGER,
    "quantityAccepted" INTEGER,
    "quantityRejected" INTEGER,
    "inspectedBy" TEXT NOT NULL,
    "inspectedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "warehouseId" TEXT,
    "workCenter" TEXT,
    "notes" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_results" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "characteristicId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "measuredValue" DOUBLE PRECISION,
    "measuredValues" JSONB,
    "findings" TEXT,
    "imageUrl" TEXT,
    "defectCode" TEXT,
    "defectDescription" TEXT,
    "sampleNumber" INTEGER,
    "subgroupId" TEXT,
    "machineId" TEXT,
    "mean" DOUBLE PRECISION,
    "range" DOUBLE PRECISION,
    "stdDev" DOUBLE PRECISION,
    "inspectedBy" TEXT NOT NULL,
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ncrs" (
    "id" TEXT NOT NULL,
    "ncrNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "source" TEXT NOT NULL,
    "inspectionId" TEXT,
    "partId" TEXT,
    "productId" TEXT,
    "workOrderId" TEXT,
    "salesOrderId" TEXT,
    "poId" TEXT,
    "lotNumber" TEXT,
    "serialNumbers" JSONB,
    "quantityAffected" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "defectCode" TEXT,
    "defectCategory" TEXT,
    "preliminaryCause" TEXT,
    "containmentAction" TEXT,
    "containedBy" TEXT,
    "containedAt" TIMESTAMP(3),
    "disposition" TEXT,
    "dispositionReason" TEXT,
    "dispositionBy" TEXT,
    "dispositionAt" TIMESTAMP(3),
    "dispositionApprovedBy" TEXT,
    "dispositionApprovedAt" TIMESTAMP(3),
    "reworkInstructions" TEXT,
    "reworkWorkOrderId" TEXT,
    "laborCost" DOUBLE PRECISION,
    "materialCost" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "customerNotified" BOOLEAN NOT NULL DEFAULT false,
    "customerNotifiedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "closureNotes" TEXT,
    "capaId" TEXT,
    "attachments" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ncrs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ncr_history" (
    "id" TEXT NOT NULL,
    "ncrId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "comment" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ncr_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capas" (
    "id" TEXT NOT NULL,
    "capaNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "source" TEXT NOT NULL,
    "sourceReference" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affectedParts" JSONB,
    "affectedProducts" JSONB,
    "affectedProcesses" JSONB,
    "ownerId" TEXT NOT NULL,
    "teamMembers" JSONB,
    "rcaMethod" TEXT,
    "rcaFindings" TEXT,
    "rcaCompletedBy" TEXT,
    "rcaCompletedAt" TIMESTAMP(3),
    "rootCause" TEXT,
    "immediateAction" TEXT,
    "immediateActionBy" TEXT,
    "immediateActionAt" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "originalTargetDate" TIMESTAMP(3),
    "verificationMethod" TEXT,
    "verificationResults" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "effectivenessScore" INTEGER,
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "closureNotes" TEXT,
    "estimatedCost" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    "attachments" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capa_actions" (
    "id" TEXT NOT NULL,
    "capaId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "completionNotes" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capa_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capa_history" (
    "id" TEXT NOT NULL,
    "capaId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "comment" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capa_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot_transactions" (
    "id" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "partId" TEXT,
    "productId" TEXT,
    "quantity" INTEGER NOT NULL,
    "previousQty" INTEGER,
    "newQty" INTEGER,
    "poId" TEXT,
    "poLineNumber" INTEGER,
    "workOrderId" TEXT,
    "salesOrderId" TEXT,
    "soLineNumber" INTEGER,
    "inspectionId" TEXT,
    "ncrId" TEXT,
    "fromWarehouseId" TEXT,
    "toWarehouseId" TEXT,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "parentLots" JSONB,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lot_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrap_disposals" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "lotNumber" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "disposalMethod" TEXT NOT NULL,
    "disposalReference" TEXT,
    "notes" TEXT,
    "disposedBy" TEXT NOT NULL,
    "disposedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scrap_disposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates_of_conformance" (
    "id" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "salesOrderLineId" TEXT,
    "productId" TEXT NOT NULL,
    "lotNumbers" JSONB NOT NULL,
    "serialNumbers" JSONB,
    "quantity" INTEGER NOT NULL,
    "inspectionId" TEXT,
    "specifications" JSONB,
    "testResults" JSONB,
    "preparedBy" TEXT NOT NULL,
    "preparedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "issuedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_of_conformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'minor',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "defect_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_centers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "department" TEXT,
    "location" TEXT,
    "capacityType" TEXT NOT NULL DEFAULT 'hours',
    "capacityPerDay" DOUBLE PRECISION NOT NULL,
    "capacityPerHour" DOUBLE PRECISION,
    "efficiency" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "utilizationTarget" DOUBLE PRECISION NOT NULL DEFAULT 85,
    "workingHoursStart" TEXT NOT NULL DEFAULT '08:00',
    "workingHoursEnd" TEXT NOT NULL DEFAULT '17:00',
    "breakMinutes" INTEGER NOT NULL DEFAULT 60,
    "workingDays" JSONB NOT NULL DEFAULT '[1,2,3,4,5]',
    "hourlyRate" DOUBLE PRECISION,
    "setupCostPerHour" DOUBLE PRECISION,
    "overheadRate" DOUBLE PRECISION,
    "maxConcurrentJobs" INTEGER NOT NULL DEFAULT 1,
    "requiresOperator" BOOLEAN NOT NULL DEFAULT true,
    "operatorSkillLevel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentJob" TEXT,
    "lastMaintenanceDate" TIMESTAMP(3),
    "nextMaintenanceDate" TIMESTAMP(3),
    "maintenanceInterval" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routings" (
    "id" TEXT NOT NULL,
    "routingNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "productId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "effectiveDate" TIMESTAMP(3),
    "obsoleteDate" TIMESTAMP(3),
    "totalSetupTime" DOUBLE PRECISION,
    "totalRunTime" DOUBLE PRECISION,
    "totalLaborTime" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_operations" (
    "id" TEXT NOT NULL,
    "routingId" TEXT NOT NULL,
    "operationNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "workCenterId" TEXT NOT NULL,
    "alternateWorkCenters" JSONB,
    "setupTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "runTimePerUnit" DOUBLE PRECISION NOT NULL,
    "waitTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "moveTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborTimePerUnit" DOUBLE PRECISION,
    "operatorsRequired" INTEGER NOT NULL DEFAULT 1,
    "skillRequired" TEXT,
    "overlapPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "canRunParallel" BOOLEAN NOT NULL DEFAULT false,
    "inspectionRequired" BOOLEAN NOT NULL DEFAULT false,
    "inspectionPlanId" TEXT,
    "workInstructions" TEXT,
    "toolsRequired" JSONB,
    "isSubcontracted" BOOLEAN NOT NULL DEFAULT false,
    "supplierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routing_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_operations" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "routingOperationId" TEXT,
    "operationNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "workCenterId" TEXT NOT NULL,
    "plannedSetupTime" DOUBLE PRECISION NOT NULL,
    "plannedRunTime" DOUBLE PRECISION NOT NULL,
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "actualSetupTime" DOUBLE PRECISION,
    "actualRunTime" DOUBLE PRECISION,
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "quantityPlanned" INTEGER NOT NULL,
    "quantityCompleted" INTEGER NOT NULL DEFAULT 0,
    "quantityScrapped" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "schedulePriority" INTEGER NOT NULL DEFAULT 50,
    "startedBy" TEXT,
    "completedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_order_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_operations" (
    "id" TEXT NOT NULL,
    "workOrderOperationId" TEXT NOT NULL,
    "workCenterId" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "hasConflict" BOOLEAN NOT NULL DEFAULT false,
    "conflictReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacity_records" (
    "id" TEXT NOT NULL,
    "workCenterId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "availableHours" DOUBLE PRECISION NOT NULL,
    "availableUnits" DOUBLE PRECISION,
    "plannedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scheduledHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utilization" DOUBLE PRECISION,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "downtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capacity_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labor_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workOrderOperationId" TEXT,
    "workCenterId" TEXT,
    "type" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "durationMinutes" DOUBLE PRECISION,
    "quantityProduced" INTEGER,
    "quantityScrapped" INTEGER,
    "hourlyRate" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "notes" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labor_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "downtime_records" (
    "id" TEXT NOT NULL,
    "workCenterId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "durationMinutes" DOUBLE PRECISION,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "category" TEXT,
    "scheduledOpsAffected" JSONB,
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "estimatedCost" DOUBLE PRECISION,
    "reportedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "downtime_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electronic_signatures" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "signatureHash" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "verificationMethod" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "previousSignatureId" TEXT,
    "chainHash" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electronic_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_trail_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "fieldName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changeSummary" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "requestId" TEXT,
    "previousEntryId" TEXT,
    "entryHash" TEXT NOT NULL,
    "chainHash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serverTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isSecurityEvent" BOOLEAN NOT NULL DEFAULT false,
    "isComplianceEvent" BOOLEAN NOT NULL DEFAULT false,
    "retentionCategory" TEXT NOT NULL DEFAULT 'standard',

    CONSTRAINT "audit_trail_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "totpSecret" TEXT,
    "phoneNumber" TEXT,
    "emailAddress" TEXT,
    "credentialId" TEXT,
    "publicKey" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mfa_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "type" TEXT NOT NULL,
    "code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "purpose" TEXT NOT NULL,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceFingerprint" TEXT,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT,
    "changeReason" TEXT,

    CONSTRAINT "password_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_policies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "minLength" INTEGER NOT NULL DEFAULT 12,
    "maxLength" INTEGER NOT NULL DEFAULT 128,
    "requireUppercase" BOOLEAN NOT NULL DEFAULT true,
    "requireLowercase" BOOLEAN NOT NULL DEFAULT true,
    "requireNumbers" BOOLEAN NOT NULL DEFAULT true,
    "requireSpecial" BOOLEAN NOT NULL DEFAULT true,
    "preventReuse" INTEGER NOT NULL DEFAULT 12,
    "maxAgeDays" INTEGER NOT NULL DEFAULT 90,
    "warnDaysBeforeExpiry" INTEGER NOT NULL DEFAULT 14,
    "maxFailedAttempts" INTEGER NOT NULL DEFAULT 5,
    "lockoutDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "preventUsername" BOOLEAN NOT NULL DEFAULT true,
    "preventCommonPasswords" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_retention_policies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entityType" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "archiveAfterDays" INTEGER,
    "actionOnExpiry" TEXT NOT NULL DEFAULT 'archive',
    "regulatoryBasis" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastExecutedAt" TIMESTAMP(3),
    "nextExecutionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itar_controlled_items" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "usmlCategory" TEXT,
    "eccn" TEXT,
    "controlReason" TEXT,
    "markingRequired" BOOLEAN NOT NULL DEFAULT true,
    "markingText" TEXT,
    "requiresUsPersonVerification" BOOLEAN NOT NULL DEFAULT true,
    "additionalRestrictions" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "classifiedBy" TEXT NOT NULL,
    "classifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itar_controlled_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itar_access_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "controlledItemId" TEXT NOT NULL,
    "accessType" TEXT NOT NULL,
    "accessGranted" BOOLEAN NOT NULL,
    "denialReason" TEXT,
    "usPersonVerified" BOOLEAN NOT NULL,
    "verificationMethod" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "purpose" TEXT,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itar_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gl_accounts" (
    "id" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "accountType" "AccountType" NOT NULL,
    "accountCategory" TEXT NOT NULL,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystemAccount" BOOLEAN NOT NULL DEFAULT false,
    "normalBalance" TEXT NOT NULL DEFAULT 'DEBIT',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gl_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "CostCategory" NOT NULL,
    "glAccountId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_cost_components" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "costTypeId" TEXT NOT NULL,
    "standardCost" DOUBLE PRECISION NOT NULL,
    "currentCost" DOUBLE PRECISION NOT NULL,
    "lastPurchaseCost" DOUBLE PRECISION,
    "averageCost" DOUBLE PRECISION,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_cost_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_cost_rollups" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "materialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overheadCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subcontractCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalStandardCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCurrentCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bomLevel" INTEGER NOT NULL DEFAULT 0,
    "lastRollupAt" TIMESTAMP(3),
    "rollupStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_cost_rollups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_costs" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "costTypeId" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "vendorInvoiceNo" TEXT,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "paymentTerms" TEXT,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceDue" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "glPosted" BOOLEAN NOT NULL DEFAULT false,
    "glPostedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_invoice_lines" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "partId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "uom" TEXT NOT NULL DEFAULT 'EA',
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "lineAmount" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "glAccountId" TEXT,
    "poLineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "bankAccountId" TEXT,
    "glPosted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "salesOrderId" TEXT,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "shipDate" TIMESTAMP(3),
    "billToAddress" JSONB,
    "shipToAddress" JSONB,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "paymentTerms" TEXT,
    "receivedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceDue" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "glPosted" BOOLEAN NOT NULL DEFAULT false,
    "glPostedAt" TIMESTAMP(3),
    "totalCost" DOUBLE PRECISION,
    "grossMargin" DOUBLE PRECISION,
    "marginPercent" DOUBLE PRECISION,
    "notes" TEXT,
    "termsAndConditions" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_invoice_lines" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "partId" TEXT,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "uom" TEXT NOT NULL DEFAULT 'EA',
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "lineAmount" DOUBLE PRECISION NOT NULL,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "revenueAccountId" TEXT,
    "soLineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "depositAccountId" TEXT,
    "glPosted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "postingDate" TIMESTAMP(3) NOT NULL,
    "entryType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "status" "JournalStatus" NOT NULL DEFAULT 'DRAFT',
    "postedBy" TEXT,
    "postedAt" TIMESTAMP(3),
    "totalDebit" DOUBLE PRECISION NOT NULL,
    "totalCredit" DOUBLE PRECISION NOT NULL,
    "reversalOf" TEXT,
    "reversedBy" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_lines" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "accountId" TEXT NOT NULL,
    "description" TEXT,
    "debitAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "departmentId" TEXT,
    "projectId" TEXT,
    "costCenterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_variances" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT,
    "partId" TEXT,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "varianceType" TEXT NOT NULL,
    "standardAmount" DOUBLE PRECISION NOT NULL,
    "actualAmount" DOUBLE PRECISION NOT NULL,
    "varianceAmount" DOUBLE PRECISION NOT NULL,
    "variancePercent" DOUBLE PRECISION NOT NULL,
    "favorableFlag" BOOLEAN NOT NULL,
    "explanation" TEXT,
    "glPosted" BOOLEAN NOT NULL DEFAULT false,
    "journalEntryId" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_variances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "isBaseCurrency" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "fromCurrencyId" TEXT NOT NULL,
    "toCurrencyCode" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barcode_definitions" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "barcodeType" TEXT NOT NULL,
    "barcodeValue" TEXT NOT NULL,
    "serialNumber" TEXT,
    "lotNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "printedAt" TIMESTAMP(3),
    "printCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barcode_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_logs" (
    "id" TEXT NOT NULL,
    "barcodeValue" TEXT NOT NULL,
    "barcodeType" TEXT,
    "resolvedType" TEXT,
    "resolvedId" TEXT,
    "scanContext" TEXT NOT NULL,
    "actionTaken" TEXT,
    "deviceId" TEXT,
    "deviceType" TEXT,
    "scannedBy" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "scan_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offline_operations" (
    "id" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "operationData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" TIMESTAMP(3),
    "deviceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "offline_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_devices" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "deviceType" TEXT NOT NULL,
    "pushToken" TEXT,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "lastActiveAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mobile_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "label_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "labelType" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 50,
    "height" INTEGER NOT NULL DEFAULT 25,
    "template" JSONB NOT NULL,
    "templateFormat" TEXT NOT NULL DEFAULT 'HTML',
    "barcodeType" TEXT NOT NULL DEFAULT 'CODE128',
    "includeQR" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "label_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pick_lists" (
    "id" TEXT NOT NULL,
    "pickListNumber" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "assignedTo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "dueDate" TIMESTAMP(3),
    "totalLines" INTEGER NOT NULL DEFAULT 0,
    "completedLines" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pick_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pick_list_lines" (
    "id" TEXT NOT NULL,
    "pickListId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "partId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "locationCode" TEXT,
    "requestedQty" DECIMAL(15,4) NOT NULL,
    "pickedQty" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "lotNumber" TEXT,
    "serialNumbers" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "pickedAt" TIMESTAMP(3),
    "pickedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "pick_list_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "siteType" TEXT NOT NULL DEFAULT 'MANUFACTURING',
    "isPlanningSite" BOOLEAN NOT NULL DEFAULT true,
    "defaultLeadTime" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_sites" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "reorderPoint" DECIMAL(15,4),
    "safetyStock" DECIMAL(15,4),
    "minOrderQty" DECIMAL(15,4),
    "maxOrderQty" DECIMAL(15,4),
    "leadTime" INTEGER,
    "isPlanned" BOOLEAN NOT NULL DEFAULT true,
    "planningMethod" TEXT NOT NULL DEFAULT 'MRP',
    "preferredSource" TEXT,
    "sourceSupplier" TEXT,
    "sourceSite" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_orders" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "fromSiteId" TEXT NOT NULL,
    "toSiteId" TEXT NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL,
    "shipDate" TIMESTAMP(3),
    "expectedDate" TIMESTAMP(3) NOT NULL,
    "receivedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_order_lines" (
    "id" TEXT NOT NULL,
    "transferOrderId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "partId" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "shippedQty" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "receivedQty" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pegging_records" (
    "id" TEXT NOT NULL,
    "demandType" TEXT NOT NULL,
    "demandId" TEXT NOT NULL,
    "demandLineId" TEXT,
    "demandPartId" TEXT NOT NULL,
    "demandQty" DECIMAL(15,4) NOT NULL,
    "demandDate" TIMESTAMP(3) NOT NULL,
    "supplyType" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "supplyLineId" TEXT,
    "supplyPartId" TEXT NOT NULL,
    "supplyQty" DECIMAL(15,4) NOT NULL,
    "supplyDate" TIMESTAMP(3) NOT NULL,
    "peggedQty" DECIMAL(15,4) NOT NULL,
    "siteId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "mrpRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pegging_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "siteId" TEXT,
    "demandSiteId" TEXT,
    "orderType" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isFirm" BOOLEAN NOT NULL DEFAULT false,
    "firmedAt" TIMESTAMP(3),
    "firmedBy" TEXT,
    "firmReason" TEXT,
    "insideTimeFence" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "releasedOrderType" TEXT,
    "releasedOrderId" TEXT,
    "mrpRunId" TEXT,
    "exceptionType" TEXT,
    "exceptionMsg" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planned_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mrp_exceptions" (
    "id" TEXT NOT NULL,
    "exceptionType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "siteId" TEXT,
    "message" TEXT NOT NULL,
    "currentDate" TIMESTAMP(3),
    "suggestedDate" TIMESTAMP(3),
    "quantity" DECIMAL(15,4),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "mrpRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mrp_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "simulationType" TEXT NOT NULL DEFAULT 'MRP',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "parameters" JSONB NOT NULL,
    "baselineRunId" TEXT,
    "resultsSummary" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_results" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "resultType" TEXT NOT NULL,
    "partId" TEXT,
    "workCenterId" TEXT,
    "siteId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(15,4),
    "baselineQty" DECIMAL(15,4),
    "variance" DECIMAL(15,4),
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulation_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atp_records" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "siteId" TEXT,
    "bucketDate" TIMESTAMP(3) NOT NULL,
    "bucketType" TEXT NOT NULL DEFAULT 'DAILY',
    "beginningQty" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "supplyQty" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "demandQty" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "atpQty" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "cumulativeATP" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atp_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planning_settings" (
    "id" TEXT NOT NULL,
    "siteId" TEXT,
    "demandTimeFence" INTEGER NOT NULL DEFAULT 7,
    "planningTimeFence" INTEGER NOT NULL DEFAULT 30,
    "frozenZone" INTEGER NOT NULL DEFAULT 3,
    "bucketType" TEXT NOT NULL DEFAULT 'DAILY',
    "safetyStockMethod" TEXT NOT NULL DEFAULT 'FIXED',
    "safetyStockDays" INTEGER NOT NULL DEFAULT 7,
    "orderSizingRule" TEXT NOT NULL DEFAULT 'LOT_FOR_LOT',
    "periodsOfSupply" INTEGER NOT NULL DEFAULT 1,
    "rescheduleInDays" INTEGER NOT NULL DEFAULT 3,
    "rescheduleOutDays" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planning_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_substitutes" (
    "id" TEXT NOT NULL,
    "primaryPartId" TEXT NOT NULL,
    "substitutePartId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "conversionFactor" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "isAutoSubstitute" BOOLEAN NOT NULL DEFAULT false,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_substitutes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "workCenterId" TEXT NOT NULL,
    "location" TEXT,
    "capacity" DOUBLE PRECISION,
    "powerKw" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "dimensions" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "installDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "purchaseCost" DOUBLE PRECISION,
    "depreciationRate" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "hourlyRunCost" DOUBLE PRECISION,
    "targetOee" DOUBLE PRECISION NOT NULL DEFAULT 85,
    "currentOee" DOUBLE PRECISION,
    "availability" DOUBLE PRECISION,
    "performance" DOUBLE PRECISION,
    "quality" DOUBLE PRECISION,
    "lastOeeUpdate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'operational',
    "criticality" TEXT NOT NULL DEFAULT 'medium',
    "lastMaintenanceDate" TIMESTAMP(3),
    "nextMaintenanceDate" TIMESTAMP(3),
    "maintenanceIntervalDays" INTEGER,
    "totalDowntimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "operatingHours" DOUBLE PRECISION,
    "designLifeHours" DOUBLE PRECISION,
    "mtbf" DOUBLE PRECISION,
    "mttr" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_schedules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "equipmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "intervalValue" INTEGER NOT NULL,
    "intervalUnit" TEXT NOT NULL DEFAULT 'days',
    "estimatedDuration" DOUBLE PRECISION NOT NULL,
    "requiredSkills" JSONB,
    "checklistItems" JSONB,
    "instructions" TEXT,
    "safetyNotes" TEXT,
    "partsRequired" JSONB,
    "lastExecutedAt" TIMESTAMP(3),
    "nextDueDate" TIMESTAMP(3),
    "advanceNoticeDays" INTEGER NOT NULL DEFAULT 7,
    "estimatedCost" DOUBLE PRECISION,
    "laborCostPerHour" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "problemReported" TEXT,
    "rootCause" TEXT,
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "estimatedDuration" DOUBLE PRECISION,
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "actualDuration" DOUBLE PRECISION,
    "assignedTo" TEXT,
    "assignedTeam" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "workPerformed" TEXT,
    "partsUsed" JSONB,
    "findings" TEXT,
    "recommendations" TEXT,
    "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "partsCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "externalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requestedBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "userId" TEXT,
    "department" TEXT,
    "position" TEXT,
    "employmentType" TEXT NOT NULL DEFAULT 'full_time',
    "hireDate" TIMESTAMP(3),
    "terminationDate" TIMESTAMP(3),
    "defaultWorkCenterId" TEXT,
    "shiftPattern" TEXT,
    "hourlyRate" DOUBLE PRECISION,
    "overtimeRate" DOUBLE PRECISION,
    "certifications" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "workCenterType" TEXT,
    "trainingRequired" BOOLEAN NOT NULL DEFAULT true,
    "certificationRequired" BOOLEAN NOT NULL DEFAULT false,
    "recertificationDays" INTEGER,
    "hasLevels" BOOLEAN NOT NULL DEFAULT true,
    "maxLevel" INTEGER NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_skills" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "proficiency" TEXT NOT NULL DEFAULT 'beginner',
    "trainedDate" TIMESTAMP(3),
    "trainedBy" TEXT,
    "certifiedDate" TIMESTAMP(3),
    "certificationExpiry" TIMESTAMP(3),
    "certificateNumber" TEXT,
    "lastAssessedDate" TIMESTAMP(3),
    "assessedBy" TEXT,
    "assessmentScore" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "durationHours" DOUBLE PRECISION NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "breakSchedule" JSONB,
    "workingDays" JSONB NOT NULL DEFAULT '[1,2,3,4,5]',
    "overtimeAfterHours" DOUBLE PRECISION,
    "overtimeRate" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "efficiencyFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_assignments" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "assignmentType" TEXT NOT NULL DEFAULT 'regular',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "plannedStart" TIMESTAMP(3),
    "plannedEnd" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "regularHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "leaveType" TEXT,
    "leaveApprovedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_center_capacity" (
    "id" TEXT NOT NULL,
    "workCenterId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "baseCapacityHours" DOUBLE PRECISION NOT NULL,
    "shiftHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maintenanceHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "downtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "holidayHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "availableHours" DOUBLE PRECISION NOT NULL,
    "scheduledHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utilization" DOUBLE PRECISION,
    "efficiency" DOUBLE PRECISION,
    "plannedHeadcount" INTEGER NOT NULL DEFAULT 0,
    "actualHeadcount" INTEGER NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_center_capacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Vietnam',
    "taxCode" TEXT,
    "logo" TEXT,
    "primaryColor" TEXT DEFAULT '#3B82F6',
    "secondaryColor" TEXT DEFAULT '#1E40AF',
    "plan" "TenantPlan" NOT NULL DEFAULT 'TRIAL',
    "planStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planEndDate" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "maxStorage" BIGINT NOT NULL DEFAULT 1073741824,
    "maxApiCalls" INTEGER NOT NULL DEFAULT 10000,
    "maxParts" INTEGER NOT NULL DEFAULT 1000,
    "maxOrders" INTEGER NOT NULL DEFAULT 500,
    "currentUsers" INTEGER NOT NULL DEFAULT 0,
    "currentStorage" BIGINT NOT NULL DEFAULT 0,
    "currentApiCalls" INTEGER NOT NULL DEFAULT 0,
    "currentParts" INTEGER NOT NULL DEFAULT 0,
    "features" JSONB,
    "settings" JSONB,
    "billingEmail" TEXT,
    "billingAddress" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plan" "TenantPlan" NOT NULL,
    "priceMonthly" DOUBLE PRECISION NOT NULL,
    "priceYearly" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "lastPaymentDate" TIMESTAMP(3),
    "nextPaymentDate" TIMESTAMP(3),
    "invoiceNumber" TEXT,
    "invoiceUrl" TEXT,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantInvitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "department" TEXT,
    "invitedById" TEXT NOT NULL,
    "invitedByName" TEXT,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT,
    "permissions" TEXT[],
    "scopes" TEXT[],
    "rateLimit" INTEGER NOT NULL DEFAULT 1000,
    "rateLimitBurst" INTEGER NOT NULL DEFAULT 100,
    "allowedIps" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "lastUsedIp" TEXT,
    "totalRequests" BIGINT NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantWebhook" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[],
    "headers" JSONB,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "retryDelay" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "lastStatus" INTEGER,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantUsageLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "apiCalls" INTEGER NOT NULL DEFAULT 0,
    "storageBytes" BIGINT NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "partsCount" INTEGER NOT NULL DEFAULT 0,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "reportsGenerated" INTEGER NOT NULL DEFAULT 0,
    "computeMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_threads" (
    "id" TEXT NOT NULL,
    "contextType" "ContextType" NOT NULL,
    "contextId" TEXT NOT NULL,
    "contextTitle" TEXT,
    "title" TEXT,
    "status" "ThreadStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "ThreadPriority" NOT NULL DEFAULT 'NORMAL',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,

    CONSTRAINT "conversation_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isSystemMessage" BOOLEAN NOT NULL DEFAULT false,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_participants" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),
    "lastReadMessageId" TEXT,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "thread_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "mentionType" "MentionType" NOT NULL,
    "userId" TEXT,
    "roleName" TEXT,
    "startIndex" INTEGER,
    "endIndex" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" "AttachmentType" NOT NULL,
    "filename" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "thumbnailUrl" TEXT,
    "capturedContext" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_edit_history" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "previousContent" TEXT NOT NULL,
    "editedById" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "message_edit_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_links" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "entityType" "LinkedEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityTitle" TEXT NOT NULL,
    "entitySubtitle" TEXT,
    "entityIcon" TEXT,
    "entityStatus" TEXT,
    "startIndex" INTEGER,
    "endIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "entityType" "WorkflowEntityType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "triggerConditions" JSONB,
    "defaultSlaHours" INTEGER,
    "escalationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_steps" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WorkflowStepType" NOT NULL DEFAULT 'APPROVAL',
    "approverRole" TEXT,
    "approverUserId" TEXT,
    "approverCondition" JSONB,
    "conditions" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "slaHours" INTEGER,
    "autoEscalate" BOOLEAN NOT NULL DEFAULT false,
    "escalateTo" TEXT,
    "nextStepOnApprove" INTEGER,
    "nextStepOnReject" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "entityType" "WorkflowEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'PENDING',
    "currentStepNumber" INTEGER NOT NULL DEFAULT 1,
    "contextData" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "initiatedBy" TEXT NOT NULL,
    "finalDecision" "ApprovalDecision",
    "finalComments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_approvals" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "delegatedTo" TEXT,
    "delegationReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_history" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "stepNumber" INTEGER,
    "performedBy" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "comments" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_notifications" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "deliveryStatus" TEXT NOT NULL DEFAULT 'pending',
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_dashboards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "layout" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "widgetType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleVi" TEXT,
    "dataSource" TEXT NOT NULL,
    "metric" TEXT,
    "queryConfig" JSONB NOT NULL,
    "displayConfig" JSONB NOT NULL,
    "gridX" INTEGER NOT NULL DEFAULT 0,
    "gridY" INTEGER NOT NULL DEFAULT 0,
    "gridW" INTEGER NOT NULL DEFAULT 4,
    "gridH" INTEGER NOT NULL DEFAULT 3,
    "refreshInterval" INTEGER,
    "drillDownConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_definitions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameVi" TEXT NOT NULL,
    "description" TEXT,
    "descriptionVi" TEXT,
    "category" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "dataSource" TEXT NOT NULL,
    "aggregation" TEXT NOT NULL,
    "unit" TEXT,
    "format" TEXT NOT NULL DEFAULT 'number',
    "precision" INTEGER NOT NULL DEFAULT 2,
    "warningThreshold" DOUBLE PRECISION,
    "criticalThreshold" DOUBLE PRECISION,
    "targetValue" DOUBLE PRECISION,
    "thresholdDirection" TEXT NOT NULL DEFAULT 'higher_is_better',
    "trendPeriod" TEXT NOT NULL DEFAULT 'month',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_schedules" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "name" TEXT,
    "frequency" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "time" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "recipients" JSONB NOT NULL,
    "outputFormat" TEXT NOT NULL DEFAULT 'pdf',
    "parameters" JSONB,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" TEXT,
    "nextRunAt" TIMESTAMP(3),
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_instances" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT,
    "reportId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "format" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "expiresAt" TIMESTAMP(3),
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadAt" TIMESTAMP(3),
    "recipients" JSONB,
    "deliveryStatus" TEXT,

    CONSTRAINT "report_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameVi" TEXT,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "thumbnail" TEXT,
    "layout" JSONB NOT NULL,
    "widgets" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_sessions" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "detectedType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "columnMapping" JSONB NOT NULL,
    "validationErrors" JSONB,
    "importedBy" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "rollbackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_logs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "data" JSONB NOT NULL,
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_mappings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "mapping" JSONB NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "tables" INTEGER,
    "records" INTEGER,
    "duration" INTEGER,
    "error" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_schedules" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "frequency" TEXT NOT NULL,
    "timeOfDay" TEXT NOT NULL,
    "retention" INTEGER NOT NULL DEFAULT 30,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_views" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "columns" JSONB,
    "sortBy" TEXT,
    "sortOrder" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_history" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT,
    "templateId" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "recipients" JSONB,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_alerts" (
    "id" TEXT NOT NULL,
    "characteristicId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "violation" JSONB,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityNumber" TEXT NOT NULL,
    "status" "WorkSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "workflowStep" INTEGER NOT NULL DEFAULT 1,
    "workflowTotalSteps" INTEGER NOT NULL DEFAULT 1,
    "workflowStepName" TEXT NOT NULL DEFAULT '',
    "contextSummary" TEXT NOT NULL DEFAULT '',
    "contextJson" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalActiveTime" INTEGER NOT NULL DEFAULT 0,
    "resumeUrl" TEXT NOT NULL DEFAULT '',
    "resumeStateJson" JSONB,

    CONSTRAINT "work_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_activities" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataJson" JSONB,

    CONSTRAINT "session_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");

-- CreateIndex
CREATE INDEX "suppliers_status_idx" ON "suppliers"("status");

-- CreateIndex
CREATE INDEX "suppliers_rating_idx" ON "suppliers"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "parts_partNumber_key" ON "parts"("partNumber");

-- CreateIndex
CREATE INDEX "parts_category_idx" ON "parts"("category");

-- CreateIndex
CREATE INDEX "parts_lifecycleStatus_idx" ON "parts"("lifecycleStatus");

-- CreateIndex
CREATE INDEX "parts_status_idx" ON "parts"("status");

-- CreateIndex
CREATE INDEX "parts_isCritical_idx" ON "parts"("isCritical");

-- CreateIndex
CREATE UNIQUE INDEX "part_planning_partId_key" ON "part_planning"("partId");

-- CreateIndex
CREATE INDEX "part_planning_makeOrBuy_idx" ON "part_planning"("makeOrBuy");

-- CreateIndex
CREATE INDEX "part_costs_partId_idx" ON "part_costs"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "part_specs_partId_key" ON "part_specs"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "part_compliance_partId_key" ON "part_compliance"("partId");

-- CreateIndex
CREATE INDEX "part_compliance_ndaaCompliant_idx" ON "part_compliance"("ndaaCompliant");

-- CreateIndex
CREATE INDEX "part_compliance_itarControlled_idx" ON "part_compliance"("itarControlled");

-- CreateIndex
CREATE INDEX "part_suppliers_partId_idx" ON "part_suppliers"("partId");

-- CreateIndex
CREATE INDEX "part_suppliers_supplierId_idx" ON "part_suppliers"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "part_suppliers_partId_supplierId_key" ON "part_suppliers"("partId", "supplierId");

-- CreateIndex
CREATE INDEX "part_alternates_partId_idx" ON "part_alternates"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "part_alternates_partId_alternatePartId_key" ON "part_alternates"("partId", "alternatePartId");

-- CreateIndex
CREATE INDEX "part_documents_partId_idx" ON "part_documents"("partId");

-- CreateIndex
CREATE INDEX "part_revisions_partId_idx" ON "part_revisions"("partId");

-- CreateIndex
CREATE INDEX "part_costs_history_partId_idx" ON "part_costs_history"("partId");

-- CreateIndex
CREATE INDEX "part_costs_history_effectiveDate_idx" ON "part_costs_history"("effectiveDate");

-- CreateIndex
CREATE INDEX "part_certifications_partId_idx" ON "part_certifications"("partId");

-- CreateIndex
CREATE INDEX "part_certifications_certificationType_idx" ON "part_certifications"("certificationType");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "products_defaultWorkCenterId_idx" ON "products"("defaultWorkCenterId");

-- CreateIndex
CREATE INDEX "bom_headers_productId_idx" ON "bom_headers"("productId");

-- CreateIndex
CREATE INDEX "bom_headers_status_idx" ON "bom_headers"("status");

-- CreateIndex
CREATE INDEX "bom_headers_effectiveDate_idx" ON "bom_headers"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "bom_headers_productId_version_key" ON "bom_headers"("productId", "version");

-- CreateIndex
CREATE INDEX "bom_lines_moduleCode_idx" ON "bom_lines"("moduleCode");

-- CreateIndex
CREATE INDEX "bom_lines_bomType_idx" ON "bom_lines"("bomType");

-- CreateIndex
CREATE INDEX "bom_lines_alternateGroup_idx" ON "bom_lines"("alternateGroup");

-- CreateIndex
CREATE UNIQUE INDEX "bom_lines_bomId_lineNumber_key" ON "bom_lines"("bomId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE INDEX "warehouses_siteId_idx" ON "warehouses"("siteId");

-- CreateIndex
CREATE INDEX "warehouses_type_idx" ON "warehouses"("type");

-- CreateIndex
CREATE INDEX "inventory_partId_idx" ON "inventory"("partId");

-- CreateIndex
CREATE INDEX "inventory_warehouseId_idx" ON "inventory"("warehouseId");

-- CreateIndex
CREATE INDEX "inventory_partId_warehouseId_idx" ON "inventory"("partId", "warehouseId");

-- CreateIndex
CREATE INDEX "inventory_quantity_idx" ON "inventory"("quantity");

-- CreateIndex
CREATE INDEX "inventory_expiryDate_idx" ON "inventory"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_partId_warehouseId_lotNumber_key" ON "inventory"("partId", "warehouseId", "lotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE INDEX "customers_type_idx" ON "customers"("type");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_orderNumber_key" ON "sales_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "sales_orders_customerId_orderDate_idx" ON "sales_orders"("customerId", "orderDate");

-- CreateIndex
CREATE INDEX "sales_orders_status_idx" ON "sales_orders"("status");

-- CreateIndex
CREATE INDEX "sales_orders_status_orderDate_idx" ON "sales_orders"("status", "orderDate");

-- CreateIndex
CREATE INDEX "sales_orders_requiredDate_idx" ON "sales_orders"("requiredDate");

-- CreateIndex
CREATE INDEX "sales_order_lines_orderId_idx" ON "sales_order_lines"("orderId");

-- CreateIndex
CREATE INDEX "sales_order_lines_productId_idx" ON "sales_order_lines"("productId");

-- CreateIndex
CREATE INDEX "sales_order_lines_status_idx" ON "sales_order_lines"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sales_order_lines_orderId_lineNumber_key" ON "sales_order_lines"("orderId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shipmentNumber_key" ON "shipments"("shipmentNumber");

-- CreateIndex
CREATE INDEX "shipments_salesOrderId_idx" ON "shipments"("salesOrderId");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("status");

-- CreateIndex
CREATE INDEX "shipments_customerId_idx" ON "shipments"("customerId");

-- CreateIndex
CREATE INDEX "shipment_lines_shipmentId_idx" ON "shipment_lines"("shipmentId");

-- CreateIndex
CREATE INDEX "shipment_lines_productId_idx" ON "shipment_lines"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_lines_shipmentId_lineNumber_key" ON "shipment_lines"("shipmentId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_poNumber_key" ON "purchase_orders"("poNumber");

-- CreateIndex
CREATE INDEX "purchase_orders_supplierId_status_idx" ON "purchase_orders"("supplierId", "status");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_orders_expectedDate_idx" ON "purchase_orders"("expectedDate");

-- CreateIndex
CREATE INDEX "purchase_orders_orderDate_idx" ON "purchase_orders"("orderDate");

-- CreateIndex
CREATE INDEX "purchase_orders_supplierId_orderDate_idx" ON "purchase_orders"("supplierId", "orderDate");

-- CreateIndex
CREATE INDEX "purchase_order_lines_poId_idx" ON "purchase_order_lines"("poId");

-- CreateIndex
CREATE INDEX "purchase_order_lines_partId_idx" ON "purchase_order_lines"("partId");

-- CreateIndex
CREATE INDEX "purchase_order_lines_status_idx" ON "purchase_order_lines"("status");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_lines_poId_lineNumber_key" ON "purchase_order_lines"("poId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "mrp_runs_runNumber_key" ON "mrp_runs"("runNumber");

-- CreateIndex
CREATE INDEX "mrp_runs_status_idx" ON "mrp_runs"("status");

-- CreateIndex
CREATE INDEX "mrp_runs_runDate_idx" ON "mrp_runs"("runDate");

-- CreateIndex
CREATE INDEX "mrp_runs_status_runDate_idx" ON "mrp_runs"("status", "runDate");

-- CreateIndex
CREATE INDEX "mrp_suggestions_mrpRunId_idx" ON "mrp_suggestions"("mrpRunId");

-- CreateIndex
CREATE INDEX "mrp_suggestions_partId_idx" ON "mrp_suggestions"("partId");

-- CreateIndex
CREATE INDEX "mrp_suggestions_status_idx" ON "mrp_suggestions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_woNumber_key" ON "work_orders"("woNumber");

-- CreateIndex
CREATE INDEX "work_orders_status_idx" ON "work_orders"("status");

-- CreateIndex
CREATE INDEX "work_orders_productId_idx" ON "work_orders"("productId");

-- CreateIndex
CREATE INDEX "work_orders_status_createdAt_idx" ON "work_orders"("status", "createdAt");

-- CreateIndex
CREATE INDEX "work_orders_plannedStart_plannedEnd_idx" ON "work_orders"("plannedStart", "plannedEnd");

-- CreateIndex
CREATE UNIQUE INDEX "production_receipts_receiptNumber_key" ON "production_receipts"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "production_receipts_workOrderId_key" ON "production_receipts"("workOrderId");

-- CreateIndex
CREATE INDEX "production_receipts_status_idx" ON "production_receipts"("status");

-- CreateIndex
CREATE INDEX "production_receipts_warehouseId_status_idx" ON "production_receipts"("warehouseId", "status");

-- CreateIndex
CREATE INDEX "material_allocations_workOrderId_idx" ON "material_allocations"("workOrderId");

-- CreateIndex
CREATE INDEX "material_allocations_partId_idx" ON "material_allocations"("partId");

-- CreateIndex
CREATE INDEX "material_allocations_status_idx" ON "material_allocations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "material_allocations_workOrderId_partId_key" ON "material_allocations"("workOrderId", "partId");

-- CreateIndex
CREATE INDEX "demand_forecasts_productId_idx" ON "demand_forecasts"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "demand_forecasts_productId_period_periodType_key" ON "demand_forecasts"("productId", "period", "periodType");

-- CreateIndex
CREATE INDEX "lead_time_predictions_supplierId_idx" ON "lead_time_predictions"("supplierId");

-- CreateIndex
CREATE INDEX "lead_time_predictions_partId_idx" ON "lead_time_predictions"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "lead_time_predictions_supplierId_partId_key" ON "lead_time_predictions"("supplierId", "partId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_risk_scores_supplierId_key" ON "supplier_risk_scores"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_risk_scores_riskLevel_idx" ON "supplier_risk_scores"("riskLevel");

-- CreateIndex
CREATE INDEX "supplier_risk_scores_overallScore_idx" ON "supplier_risk_scores"("overallScore");

-- CreateIndex
CREATE INDEX "ai_recommendations_status_priority_idx" ON "ai_recommendations"("status", "priority");

-- CreateIndex
CREATE INDEX "ai_recommendations_category_idx" ON "ai_recommendations"("category");

-- CreateIndex
CREATE INDEX "ai_model_logs_modelName_createdAt_idx" ON "ai_model_logs"("modelName", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "activity_logs_userId_isRead_idx" ON "activity_logs"("userId", "isRead");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_userId_key" ON "notification_settings"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_sourceType_sourceId_idx" ON "notifications"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "saved_reports_userId_idx" ON "saved_reports"("userId");

-- CreateIndex
CREATE INDEX "saved_reports_type_idx" ON "saved_reports"("type");

-- CreateIndex
CREATE INDEX "saved_reports_isPublic_idx" ON "saved_reports"("isPublic");

-- CreateIndex
CREATE INDEX "import_jobs_userId_idx" ON "import_jobs"("userId");

-- CreateIndex
CREATE INDEX "import_jobs_status_idx" ON "import_jobs"("status");

-- CreateIndex
CREATE INDEX "import_jobs_createdAt_idx" ON "import_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "import_rows_importJobId_status_idx" ON "import_rows"("importJobId", "status");

-- CreateIndex
CREATE INDEX "import_rows_importJobId_rowNumber_idx" ON "import_rows"("importJobId", "rowNumber");

-- CreateIndex
CREATE INDEX "export_jobs_userId_idx" ON "export_jobs"("userId");

-- CreateIndex
CREATE INDEX "export_jobs_status_idx" ON "export_jobs"("status");

-- CreateIndex
CREATE INDEX "export_jobs_createdAt_idx" ON "export_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "excel_templates_type_isActive_idx" ON "excel_templates"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "excel_templates_type_version_key" ON "excel_templates"("type", "version");

-- CreateIndex
CREATE INDEX "sync_schedules_userId_idx" ON "sync_schedules"("userId");

-- CreateIndex
CREATE INDEX "sync_schedules_status_idx" ON "sync_schedules"("status");

-- CreateIndex
CREATE INDEX "sync_schedules_nextRunAt_idx" ON "sync_schedules"("nextRunAt");

-- CreateIndex
CREATE INDEX "migration_batches_userId_idx" ON "migration_batches"("userId");

-- CreateIndex
CREATE INDEX "migration_batches_status_idx" ON "migration_batches"("status");

-- CreateIndex
CREATE INDEX "migration_batches_createdAt_idx" ON "migration_batches"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_plans_planNumber_key" ON "inspection_plans"("planNumber");

-- CreateIndex
CREATE INDEX "inspection_plans_type_status_idx" ON "inspection_plans"("type", "status");

-- CreateIndex
CREATE INDEX "inspection_plans_partId_idx" ON "inspection_plans"("partId");

-- CreateIndex
CREATE INDEX "inspection_characteristics_planId_idx" ON "inspection_characteristics"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "inspections_inspectionNumber_key" ON "inspections"("inspectionNumber");

-- CreateIndex
CREATE INDEX "inspections_type_status_idx" ON "inspections"("type", "status");

-- CreateIndex
CREATE INDEX "inspections_sourceType_idx" ON "inspections"("sourceType");

-- CreateIndex
CREATE INDEX "inspections_lotNumber_idx" ON "inspections"("lotNumber");

-- CreateIndex
CREATE INDEX "inspections_partId_idx" ON "inspections"("partId");

-- CreateIndex
CREATE INDEX "inspections_workOrderId_idx" ON "inspections"("workOrderId");

-- CreateIndex
CREATE INDEX "inspection_results_inspectionId_idx" ON "inspection_results"("inspectionId");

-- CreateIndex
CREATE INDEX "inspection_results_result_idx" ON "inspection_results"("result");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_results_inspectionId_characteristicId_key" ON "inspection_results"("inspectionId", "characteristicId");

-- CreateIndex
CREATE UNIQUE INDEX "ncrs_ncrNumber_key" ON "ncrs"("ncrNumber");

-- CreateIndex
CREATE INDEX "ncrs_status_idx" ON "ncrs"("status");

-- CreateIndex
CREATE INDEX "ncrs_priority_idx" ON "ncrs"("priority");

-- CreateIndex
CREATE INDEX "ncrs_lotNumber_idx" ON "ncrs"("lotNumber");

-- CreateIndex
CREATE INDEX "ncrs_partId_idx" ON "ncrs"("partId");

-- CreateIndex
CREATE INDEX "ncr_history_ncrId_idx" ON "ncr_history"("ncrId");

-- CreateIndex
CREATE UNIQUE INDEX "capas_capaNumber_key" ON "capas"("capaNumber");

-- CreateIndex
CREATE INDEX "capas_status_idx" ON "capas"("status");

-- CreateIndex
CREATE INDEX "capas_type_idx" ON "capas"("type");

-- CreateIndex
CREATE INDEX "capas_ownerId_idx" ON "capas"("ownerId");

-- CreateIndex
CREATE INDEX "capa_actions_capaId_idx" ON "capa_actions"("capaId");

-- CreateIndex
CREATE INDEX "capa_actions_assigneeId_status_idx" ON "capa_actions"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "capa_history_capaId_idx" ON "capa_history"("capaId");

-- CreateIndex
CREATE INDEX "lot_transactions_lotNumber_idx" ON "lot_transactions"("lotNumber");

-- CreateIndex
CREATE INDEX "lot_transactions_partId_lotNumber_idx" ON "lot_transactions"("partId", "lotNumber");

-- CreateIndex
CREATE INDEX "lot_transactions_transactionType_idx" ON "lot_transactions"("transactionType");

-- CreateIndex
CREATE INDEX "lot_transactions_createdAt_idx" ON "lot_transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "scrap_disposals_partId_idx" ON "scrap_disposals"("partId");

-- CreateIndex
CREATE INDEX "scrap_disposals_disposedAt_idx" ON "scrap_disposals"("disposedAt");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_of_conformance_certificateNumber_key" ON "certificates_of_conformance"("certificateNumber");

-- CreateIndex
CREATE INDEX "certificates_of_conformance_salesOrderId_idx" ON "certificates_of_conformance"("salesOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "defect_codes_code_key" ON "defect_codes"("code");

-- CreateIndex
CREATE INDEX "defect_codes_category_idx" ON "defect_codes"("category");

-- CreateIndex
CREATE INDEX "defect_codes_severity_idx" ON "defect_codes"("severity");

-- CreateIndex
CREATE INDEX "defect_codes_isActive_idx" ON "defect_codes"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "work_centers_code_key" ON "work_centers"("code");

-- CreateIndex
CREATE INDEX "work_centers_status_idx" ON "work_centers"("status");

-- CreateIndex
CREATE INDEX "work_centers_type_idx" ON "work_centers"("type");

-- CreateIndex
CREATE UNIQUE INDEX "routings_routingNumber_key" ON "routings"("routingNumber");

-- CreateIndex
CREATE INDEX "routings_productId_status_idx" ON "routings"("productId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "routings_productId_version_key" ON "routings"("productId", "version");

-- CreateIndex
CREATE INDEX "routing_operations_routingId_idx" ON "routing_operations"("routingId");

-- CreateIndex
CREATE INDEX "routing_operations_workCenterId_idx" ON "routing_operations"("workCenterId");

-- CreateIndex
CREATE UNIQUE INDEX "routing_operations_routingId_operationNumber_key" ON "routing_operations"("routingId", "operationNumber");

-- CreateIndex
CREATE INDEX "work_order_operations_workOrderId_idx" ON "work_order_operations"("workOrderId");

-- CreateIndex
CREATE INDEX "work_order_operations_status_idx" ON "work_order_operations"("status");

-- CreateIndex
CREATE INDEX "work_order_operations_workCenterId_status_idx" ON "work_order_operations"("workCenterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "work_order_operations_workOrderId_operationNumber_key" ON "work_order_operations"("workOrderId", "operationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_operations_workOrderOperationId_key" ON "scheduled_operations"("workOrderOperationId");

-- CreateIndex
CREATE INDEX "scheduled_operations_workCenterId_scheduledStart_idx" ON "scheduled_operations"("workCenterId", "scheduledStart");

-- CreateIndex
CREATE INDEX "scheduled_operations_scheduledStart_idx" ON "scheduled_operations"("scheduledStart");

-- CreateIndex
CREATE INDEX "capacity_records_workCenterId_date_idx" ON "capacity_records"("workCenterId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "capacity_records_workCenterId_date_key" ON "capacity_records"("workCenterId", "date");

-- CreateIndex
CREATE INDEX "labor_entries_userId_startTime_idx" ON "labor_entries"("userId", "startTime");

-- CreateIndex
CREATE INDEX "labor_entries_workOrderOperationId_idx" ON "labor_entries"("workOrderOperationId");

-- CreateIndex
CREATE INDEX "labor_entries_workCenterId_startTime_idx" ON "labor_entries"("workCenterId", "startTime");

-- CreateIndex
CREATE INDEX "downtime_records_workCenterId_startTime_idx" ON "downtime_records"("workCenterId", "startTime");

-- CreateIndex
CREATE INDEX "downtime_records_type_idx" ON "downtime_records"("type");

-- CreateIndex
CREATE INDEX "electronic_signatures_entityType_entityId_idx" ON "electronic_signatures"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "electronic_signatures_userId_idx" ON "electronic_signatures"("userId");

-- CreateIndex
CREATE INDEX "electronic_signatures_signedAt_idx" ON "electronic_signatures"("signedAt");

-- CreateIndex
CREATE INDEX "audit_trail_entries_entityType_entityId_idx" ON "audit_trail_entries"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_trail_entries_userId_idx" ON "audit_trail_entries"("userId");

-- CreateIndex
CREATE INDEX "audit_trail_entries_timestamp_idx" ON "audit_trail_entries"("timestamp");

-- CreateIndex
CREATE INDEX "audit_trail_entries_action_idx" ON "audit_trail_entries"("action");

-- CreateIndex
CREATE INDEX "audit_trail_entries_isSecurityEvent_idx" ON "audit_trail_entries"("isSecurityEvent");

-- CreateIndex
CREATE INDEX "mfa_devices_userId_idx" ON "mfa_devices"("userId");

-- CreateIndex
CREATE INDEX "mfa_challenges_userId_status_idx" ON "mfa_challenges"("userId", "status");

-- CreateIndex
CREATE INDEX "mfa_challenges_expiresAt_idx" ON "mfa_challenges"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_sessionToken_key" ON "user_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "user_sessions_userId_isActive_idx" ON "user_sessions"("userId", "isActive");

-- CreateIndex
CREATE INDEX "user_sessions_sessionToken_idx" ON "user_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "user_sessions_expiresAt_idx" ON "user_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "password_history_userId_changedAt_idx" ON "password_history"("userId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_policies_name_key" ON "password_policies"("name");

-- CreateIndex
CREATE INDEX "password_policies_isDefault_idx" ON "password_policies"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "data_retention_policies_name_key" ON "data_retention_policies"("name");

-- CreateIndex
CREATE INDEX "data_retention_policies_entityType_idx" ON "data_retention_policies"("entityType");

-- CreateIndex
CREATE INDEX "itar_controlled_items_usmlCategory_idx" ON "itar_controlled_items"("usmlCategory");

-- CreateIndex
CREATE INDEX "itar_controlled_items_status_idx" ON "itar_controlled_items"("status");

-- CreateIndex
CREATE UNIQUE INDEX "itar_controlled_items_entityType_entityId_key" ON "itar_controlled_items"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "itar_access_logs_userId_idx" ON "itar_access_logs"("userId");

-- CreateIndex
CREATE INDEX "itar_access_logs_controlledItemId_idx" ON "itar_access_logs"("controlledItemId");

-- CreateIndex
CREATE INDEX "itar_access_logs_accessedAt_idx" ON "itar_access_logs"("accessedAt");

-- CreateIndex
CREATE UNIQUE INDEX "gl_accounts_accountNumber_key" ON "gl_accounts"("accountNumber");

-- CreateIndex
CREATE INDEX "gl_accounts_accountType_idx" ON "gl_accounts"("accountType");

-- CreateIndex
CREATE INDEX "gl_accounts_accountCategory_idx" ON "gl_accounts"("accountCategory");

-- CreateIndex
CREATE UNIQUE INDEX "cost_types_code_key" ON "cost_types"("code");

-- CreateIndex
CREATE INDEX "cost_types_category_idx" ON "cost_types"("category");

-- CreateIndex
CREATE INDEX "cost_types_isActive_idx" ON "cost_types"("isActive");

-- CreateIndex
CREATE INDEX "part_cost_components_partId_idx" ON "part_cost_components"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "part_cost_components_partId_costTypeId_effectiveDate_key" ON "part_cost_components"("partId", "costTypeId", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "part_cost_rollups_partId_key" ON "part_cost_rollups"("partId");

-- CreateIndex
CREATE INDEX "part_cost_rollups_rollupStatus_idx" ON "part_cost_rollups"("rollupStatus");

-- CreateIndex
CREATE INDEX "work_order_costs_workOrderId_idx" ON "work_order_costs"("workOrderId");

-- CreateIndex
CREATE INDEX "work_order_costs_transactionDate_idx" ON "work_order_costs"("transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_invoices_invoiceNumber_key" ON "purchase_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "purchase_invoices_supplierId_idx" ON "purchase_invoices"("supplierId");

-- CreateIndex
CREATE INDEX "purchase_invoices_status_idx" ON "purchase_invoices"("status");

-- CreateIndex
CREATE INDEX "purchase_invoices_dueDate_idx" ON "purchase_invoices"("dueDate");

-- CreateIndex
CREATE INDEX "purchase_invoice_lines_invoiceId_idx" ON "purchase_invoice_lines"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_payments_paymentNumber_key" ON "purchase_payments"("paymentNumber");

-- CreateIndex
CREATE INDEX "purchase_payments_invoiceId_idx" ON "purchase_payments"("invoiceId");

-- CreateIndex
CREATE INDEX "purchase_payments_paymentDate_idx" ON "purchase_payments"("paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_invoiceNumber_key" ON "sales_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "sales_invoices_customerId_idx" ON "sales_invoices"("customerId");

-- CreateIndex
CREATE INDEX "sales_invoices_status_idx" ON "sales_invoices"("status");

-- CreateIndex
CREATE INDEX "sales_invoices_dueDate_idx" ON "sales_invoices"("dueDate");

-- CreateIndex
CREATE INDEX "sales_invoice_lines_invoiceId_idx" ON "sales_invoice_lines"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_payments_paymentNumber_key" ON "sales_payments"("paymentNumber");

-- CreateIndex
CREATE INDEX "sales_payments_invoiceId_idx" ON "sales_payments"("invoiceId");

-- CreateIndex
CREATE INDEX "sales_payments_paymentDate_idx" ON "sales_payments"("paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_entryNumber_key" ON "journal_entries"("entryNumber");

-- CreateIndex
CREATE INDEX "journal_entries_entryDate_idx" ON "journal_entries"("entryDate");

-- CreateIndex
CREATE INDEX "journal_entries_source_sourceId_idx" ON "journal_entries"("source", "sourceId");

-- CreateIndex
CREATE INDEX "journal_entries_status_idx" ON "journal_entries"("status");

-- CreateIndex
CREATE INDEX "journal_lines_journalEntryId_idx" ON "journal_lines"("journalEntryId");

-- CreateIndex
CREATE INDEX "journal_lines_accountId_idx" ON "journal_lines"("accountId");

-- CreateIndex
CREATE INDEX "cost_variances_workOrderId_idx" ON "cost_variances"("workOrderId");

-- CreateIndex
CREATE INDEX "cost_variances_partId_idx" ON "cost_variances"("partId");

-- CreateIndex
CREATE INDEX "cost_variances_periodYear_periodMonth_idx" ON "cost_variances"("periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "cost_variances_varianceType_idx" ON "cost_variances"("varianceType");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE INDEX "currencies_isActive_idx" ON "currencies"("isActive");

-- CreateIndex
CREATE INDEX "exchange_rates_effectiveDate_idx" ON "exchange_rates"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_fromCurrencyId_toCurrencyCode_effectiveDate_key" ON "exchange_rates"("fromCurrencyId", "toCurrencyCode", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "barcode_definitions_barcodeValue_key" ON "barcode_definitions"("barcodeValue");

-- CreateIndex
CREATE INDEX "barcode_definitions_entityType_entityId_idx" ON "barcode_definitions"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "barcode_definitions_barcodeValue_idx" ON "barcode_definitions"("barcodeValue");

-- CreateIndex
CREATE INDEX "scan_logs_scannedBy_idx" ON "scan_logs"("scannedBy");

-- CreateIndex
CREATE INDEX "scan_logs_scannedAt_idx" ON "scan_logs"("scannedAt");

-- CreateIndex
CREATE INDEX "scan_logs_barcodeValue_idx" ON "scan_logs"("barcodeValue");

-- CreateIndex
CREATE INDEX "offline_operations_status_idx" ON "offline_operations"("status");

-- CreateIndex
CREATE INDEX "offline_operations_userId_status_idx" ON "offline_operations"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_devices_deviceId_key" ON "mobile_devices"("deviceId");

-- CreateIndex
CREATE INDEX "mobile_devices_userId_idx" ON "mobile_devices"("userId");

-- CreateIndex
CREATE INDEX "label_templates_labelType_idx" ON "label_templates"("labelType");

-- CreateIndex
CREATE INDEX "label_templates_isActive_idx" ON "label_templates"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "pick_lists_pickListNumber_key" ON "pick_lists"("pickListNumber");

-- CreateIndex
CREATE INDEX "pick_lists_status_idx" ON "pick_lists"("status");

-- CreateIndex
CREATE INDEX "pick_lists_assignedTo_idx" ON "pick_lists"("assignedTo");

-- CreateIndex
CREATE INDEX "pick_list_lines_pickListId_idx" ON "pick_list_lines"("pickListId");

-- CreateIndex
CREATE INDEX "pick_list_lines_partId_idx" ON "pick_list_lines"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "sites_code_key" ON "sites"("code");

-- CreateIndex
CREATE INDEX "sites_siteType_idx" ON "sites"("siteType");

-- CreateIndex
CREATE INDEX "inventory_sites_siteId_idx" ON "inventory_sites"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_sites_partId_siteId_key" ON "inventory_sites"("partId", "siteId");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_orders_transferNumber_key" ON "transfer_orders"("transferNumber");

-- CreateIndex
CREATE INDEX "transfer_orders_status_idx" ON "transfer_orders"("status");

-- CreateIndex
CREATE INDEX "transfer_orders_fromSiteId_idx" ON "transfer_orders"("fromSiteId");

-- CreateIndex
CREATE INDEX "transfer_orders_toSiteId_idx" ON "transfer_orders"("toSiteId");

-- CreateIndex
CREATE INDEX "transfer_order_lines_transferOrderId_idx" ON "transfer_order_lines"("transferOrderId");

-- CreateIndex
CREATE INDEX "pegging_records_demandType_demandId_idx" ON "pegging_records"("demandType", "demandId");

-- CreateIndex
CREATE INDEX "pegging_records_supplyType_supplyId_idx" ON "pegging_records"("supplyType", "supplyId");

-- CreateIndex
CREATE INDEX "pegging_records_demandPartId_idx" ON "pegging_records"("demandPartId");

-- CreateIndex
CREATE INDEX "pegging_records_supplyPartId_idx" ON "pegging_records"("supplyPartId");

-- CreateIndex
CREATE UNIQUE INDEX "planned_orders_orderNumber_key" ON "planned_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "planned_orders_partId_idx" ON "planned_orders"("partId");

-- CreateIndex
CREATE INDEX "planned_orders_siteId_idx" ON "planned_orders"("siteId");

-- CreateIndex
CREATE INDEX "planned_orders_status_idx" ON "planned_orders"("status");

-- CreateIndex
CREATE INDEX "planned_orders_dueDate_idx" ON "planned_orders"("dueDate");

-- CreateIndex
CREATE INDEX "planned_orders_isFirm_idx" ON "planned_orders"("isFirm");

-- CreateIndex
CREATE INDEX "mrp_exceptions_exceptionType_idx" ON "mrp_exceptions"("exceptionType");

-- CreateIndex
CREATE INDEX "mrp_exceptions_status_idx" ON "mrp_exceptions"("status");

-- CreateIndex
CREATE INDEX "mrp_exceptions_partId_idx" ON "mrp_exceptions"("partId");

-- CreateIndex
CREATE INDEX "mrp_exceptions_severity_idx" ON "mrp_exceptions"("severity");

-- CreateIndex
CREATE INDEX "simulations_status_idx" ON "simulations"("status");

-- CreateIndex
CREATE INDEX "simulations_createdBy_idx" ON "simulations"("createdBy");

-- CreateIndex
CREATE INDEX "simulation_results_simulationId_idx" ON "simulation_results"("simulationId");

-- CreateIndex
CREATE INDEX "simulation_results_partId_idx" ON "simulation_results"("partId");

-- CreateIndex
CREATE INDEX "atp_records_partId_idx" ON "atp_records"("partId");

-- CreateIndex
CREATE INDEX "atp_records_bucketDate_idx" ON "atp_records"("bucketDate");

-- CreateIndex
CREATE UNIQUE INDEX "atp_records_partId_siteId_bucketDate_bucketType_key" ON "atp_records"("partId", "siteId", "bucketDate", "bucketType");

-- CreateIndex
CREATE UNIQUE INDEX "planning_settings_siteId_key" ON "planning_settings"("siteId");

-- CreateIndex
CREATE INDEX "part_substitutes_primaryPartId_idx" ON "part_substitutes"("primaryPartId");

-- CreateIndex
CREATE UNIQUE INDEX "part_substitutes_primaryPartId_substitutePartId_key" ON "part_substitutes"("primaryPartId", "substitutePartId");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_code_key" ON "equipment"("code");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_serialNumber_key" ON "equipment"("serialNumber");

-- CreateIndex
CREATE INDEX "equipment_workCenterId_idx" ON "equipment"("workCenterId");

-- CreateIndex
CREATE INDEX "equipment_status_idx" ON "equipment"("status");

-- CreateIndex
CREATE INDEX "equipment_type_idx" ON "equipment"("type");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_schedules_code_key" ON "maintenance_schedules"("code");

-- CreateIndex
CREATE INDEX "maintenance_schedules_equipmentId_idx" ON "maintenance_schedules"("equipmentId");

-- CreateIndex
CREATE INDEX "maintenance_schedules_nextDueDate_idx" ON "maintenance_schedules"("nextDueDate");

-- CreateIndex
CREATE INDEX "maintenance_schedules_isActive_idx" ON "maintenance_schedules"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_orders_orderNumber_key" ON "maintenance_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "maintenance_orders_equipmentId_idx" ON "maintenance_orders"("equipmentId");

-- CreateIndex
CREATE INDEX "maintenance_orders_status_idx" ON "maintenance_orders"("status");

-- CreateIndex
CREATE INDEX "maintenance_orders_type_idx" ON "maintenance_orders"("type");

-- CreateIndex
CREATE INDEX "maintenance_orders_plannedStartDate_idx" ON "maintenance_orders"("plannedStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeCode_key" ON "employees"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "employees"("userId");

-- CreateIndex
CREATE INDEX "employees_department_idx" ON "employees"("department");

-- CreateIndex
CREATE INDEX "employees_status_idx" ON "employees"("status");

-- CreateIndex
CREATE UNIQUE INDEX "skills_code_key" ON "skills"("code");

-- CreateIndex
CREATE INDEX "skills_category_idx" ON "skills"("category");

-- CreateIndex
CREATE INDEX "employee_skills_employeeId_idx" ON "employee_skills"("employeeId");

-- CreateIndex
CREATE INDEX "employee_skills_skillId_idx" ON "employee_skills"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_skills_employeeId_skillId_key" ON "employee_skills"("employeeId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_code_key" ON "shifts"("code");

-- CreateIndex
CREATE INDEX "shifts_isActive_idx" ON "shifts"("isActive");

-- CreateIndex
CREATE INDEX "shift_assignments_employeeId_date_idx" ON "shift_assignments"("employeeId", "date");

-- CreateIndex
CREATE INDEX "shift_assignments_shiftId_date_idx" ON "shift_assignments"("shiftId", "date");

-- CreateIndex
CREATE INDEX "shift_assignments_date_status_idx" ON "shift_assignments"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "shift_assignments_employeeId_shiftId_date_key" ON "shift_assignments"("employeeId", "shiftId", "date");

-- CreateIndex
CREATE INDEX "work_center_capacity_workCenterId_date_idx" ON "work_center_capacity"("workCenterId", "date");

-- CreateIndex
CREATE INDEX "work_center_capacity_date_idx" ON "work_center_capacity"("date");

-- CreateIndex
CREATE UNIQUE INDEX "work_center_capacity_workCenterId_date_key" ON "work_center_capacity"("workCenterId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_code_key" ON "Tenant"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_domain_key" ON "Tenant"("domain");

-- CreateIndex
CREATE INDEX "Tenant_code_idx" ON "Tenant"("code");

-- CreateIndex
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_domain_idx" ON "Tenant"("domain");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE INDEX "TenantSubscription_tenantId_idx" ON "TenantSubscription"("tenantId");

-- CreateIndex
CREATE INDEX "TenantSubscription_plan_idx" ON "TenantSubscription"("plan");

-- CreateIndex
CREATE INDEX "TenantSubscription_paymentStatus_idx" ON "TenantSubscription"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "TenantInvitation_token_key" ON "TenantInvitation"("token");

-- CreateIndex
CREATE INDEX "TenantInvitation_tenantId_idx" ON "TenantInvitation"("tenantId");

-- CreateIndex
CREATE INDEX "TenantInvitation_email_idx" ON "TenantInvitation"("email");

-- CreateIndex
CREATE INDEX "TenantInvitation_token_idx" ON "TenantInvitation"("token");

-- CreateIndex
CREATE INDEX "TenantInvitation_status_idx" ON "TenantInvitation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TenantApiKey_keyHash_key" ON "TenantApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "TenantApiKey_tenantId_idx" ON "TenantApiKey"("tenantId");

-- CreateIndex
CREATE INDEX "TenantApiKey_keyHash_idx" ON "TenantApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "TenantApiKey_keyPrefix_idx" ON "TenantApiKey"("keyPrefix");

-- CreateIndex
CREATE INDEX "TenantApiKey_isActive_idx" ON "TenantApiKey"("isActive");

-- CreateIndex
CREATE INDEX "TenantWebhook_tenantId_idx" ON "TenantWebhook"("tenantId");

-- CreateIndex
CREATE INDEX "TenantWebhook_isActive_idx" ON "TenantWebhook"("isActive");

-- CreateIndex
CREATE INDEX "TenantUsageLog_tenantId_idx" ON "TenantUsageLog"("tenantId");

-- CreateIndex
CREATE INDEX "TenantUsageLog_periodStart_idx" ON "TenantUsageLog"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "TenantUsageLog_tenantId_periodStart_periodEnd_key" ON "TenantUsageLog"("tenantId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "conversation_threads_contextType_contextId_idx" ON "conversation_threads"("contextType", "contextId");

-- CreateIndex
CREATE INDEX "conversation_threads_status_idx" ON "conversation_threads"("status");

-- CreateIndex
CREATE INDEX "conversation_threads_createdById_idx" ON "conversation_threads"("createdById");

-- CreateIndex
CREATE INDEX "conversation_threads_lastMessageAt_idx" ON "conversation_threads"("lastMessageAt");

-- CreateIndex
CREATE INDEX "messages_threadId_idx" ON "messages"("threadId");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "thread_participants_userId_idx" ON "thread_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "thread_participants_threadId_userId_key" ON "thread_participants"("threadId", "userId");

-- CreateIndex
CREATE INDEX "mentions_messageId_idx" ON "mentions"("messageId");

-- CreateIndex
CREATE INDEX "mentions_userId_idx" ON "mentions"("userId");

-- CreateIndex
CREATE INDEX "mentions_roleName_idx" ON "mentions"("roleName");

-- CreateIndex
CREATE UNIQUE INDEX "mentions_messageId_userId_key" ON "mentions"("messageId", "userId");

-- CreateIndex
CREATE INDEX "message_attachments_messageId_idx" ON "message_attachments"("messageId");

-- CreateIndex
CREATE INDEX "message_attachments_type_idx" ON "message_attachments"("type");

-- CreateIndex
CREATE INDEX "message_attachments_uploadedById_idx" ON "message_attachments"("uploadedById");

-- CreateIndex
CREATE INDEX "message_edit_history_messageId_idx" ON "message_edit_history"("messageId");

-- CreateIndex
CREATE INDEX "message_edit_history_editedById_idx" ON "message_edit_history"("editedById");

-- CreateIndex
CREATE INDEX "message_edit_history_editedAt_idx" ON "message_edit_history"("editedAt");

-- CreateIndex
CREATE INDEX "entity_links_messageId_idx" ON "entity_links"("messageId");

-- CreateIndex
CREATE INDEX "entity_links_entityType_entityId_idx" ON "entity_links"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "entity_links_entityType_idx" ON "entity_links"("entityType");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_definitions_code_key" ON "workflow_definitions"("code");

-- CreateIndex
CREATE INDEX "workflow_definitions_entityType_idx" ON "workflow_definitions"("entityType");

-- CreateIndex
CREATE INDEX "workflow_definitions_isActive_idx" ON "workflow_definitions"("isActive");

-- CreateIndex
CREATE INDEX "workflow_steps_workflowId_idx" ON "workflow_steps"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_steps_workflowId_stepNumber_key" ON "workflow_steps"("workflowId", "stepNumber");

-- CreateIndex
CREATE INDEX "workflow_instances_workflowId_idx" ON "workflow_instances"("workflowId");

-- CreateIndex
CREATE INDEX "workflow_instances_entityType_entityId_idx" ON "workflow_instances"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "workflow_instances_status_idx" ON "workflow_instances"("status");

-- CreateIndex
CREATE INDEX "workflow_instances_initiatedBy_idx" ON "workflow_instances"("initiatedBy");

-- CreateIndex
CREATE INDEX "workflow_instances_dueDate_idx" ON "workflow_instances"("dueDate");

-- CreateIndex
CREATE INDEX "workflow_approvals_instanceId_idx" ON "workflow_approvals"("instanceId");

-- CreateIndex
CREATE INDEX "workflow_approvals_stepId_idx" ON "workflow_approvals"("stepId");

-- CreateIndex
CREATE INDEX "workflow_approvals_approverId_idx" ON "workflow_approvals"("approverId");

-- CreateIndex
CREATE INDEX "workflow_approvals_decision_idx" ON "workflow_approvals"("decision");

-- CreateIndex
CREATE INDEX "workflow_approvals_dueDate_idx" ON "workflow_approvals"("dueDate");

-- CreateIndex
CREATE INDEX "workflow_history_instanceId_idx" ON "workflow_history"("instanceId");

-- CreateIndex
CREATE INDEX "workflow_history_performedBy_idx" ON "workflow_history"("performedBy");

-- CreateIndex
CREATE INDEX "workflow_history_action_idx" ON "workflow_history"("action");

-- CreateIndex
CREATE INDEX "workflow_history_createdAt_idx" ON "workflow_history"("createdAt");

-- CreateIndex
CREATE INDEX "workflow_notifications_instanceId_idx" ON "workflow_notifications"("instanceId");

-- CreateIndex
CREATE INDEX "workflow_notifications_recipientId_idx" ON "workflow_notifications"("recipientId");

-- CreateIndex
CREATE INDEX "workflow_notifications_deliveryStatus_idx" ON "workflow_notifications"("deliveryStatus");

-- CreateIndex
CREATE INDEX "workflow_notifications_createdAt_idx" ON "workflow_notifications"("createdAt");

-- CreateIndex
CREATE INDEX "analytics_dashboards_userId_idx" ON "analytics_dashboards"("userId");

-- CreateIndex
CREATE INDEX "analytics_dashboards_isPublic_idx" ON "analytics_dashboards"("isPublic");

-- CreateIndex
CREATE INDEX "dashboard_widgets_dashboardId_idx" ON "dashboard_widgets"("dashboardId");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_definitions_code_key" ON "kpi_definitions"("code");

-- CreateIndex
CREATE INDEX "kpi_definitions_category_idx" ON "kpi_definitions"("category");

-- CreateIndex
CREATE INDEX "kpi_definitions_isActive_idx" ON "kpi_definitions"("isActive");

-- CreateIndex
CREATE INDEX "report_schedules_reportId_idx" ON "report_schedules"("reportId");

-- CreateIndex
CREATE INDEX "report_schedules_nextRunAt_idx" ON "report_schedules"("nextRunAt");

-- CreateIndex
CREATE INDEX "report_schedules_isActive_idx" ON "report_schedules"("isActive");

-- CreateIndex
CREATE INDEX "report_instances_reportId_idx" ON "report_instances"("reportId");

-- CreateIndex
CREATE INDEX "report_instances_scheduleId_idx" ON "report_instances"("scheduleId");

-- CreateIndex
CREATE INDEX "report_instances_status_idx" ON "report_instances"("status");

-- CreateIndex
CREATE INDEX "report_instances_generatedAt_idx" ON "report_instances"("generatedAt");

-- CreateIndex
CREATE INDEX "dashboard_templates_category_idx" ON "dashboard_templates"("category");

-- CreateIndex
CREATE INDEX "dashboard_templates_isActive_idx" ON "dashboard_templates"("isActive");

-- CreateIndex
CREATE INDEX "import_sessions_importedBy_idx" ON "import_sessions"("importedBy");

-- CreateIndex
CREATE INDEX "import_sessions_status_idx" ON "import_sessions"("status");

-- CreateIndex
CREATE INDEX "import_sessions_detectedType_idx" ON "import_sessions"("detectedType");

-- CreateIndex
CREATE INDEX "import_sessions_createdAt_idx" ON "import_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "import_logs_sessionId_idx" ON "import_logs"("sessionId");

-- CreateIndex
CREATE INDEX "import_logs_status_idx" ON "import_logs"("status");

-- CreateIndex
CREATE INDEX "import_logs_entityType_idx" ON "import_logs"("entityType");

-- CreateIndex
CREATE INDEX "import_mappings_targetType_idx" ON "import_mappings"("targetType");

-- CreateIndex
CREATE INDEX "import_mappings_createdBy_idx" ON "import_mappings"("createdBy");

-- CreateIndex
CREATE INDEX "import_mappings_usageCount_idx" ON "import_mappings"("usageCount");

-- CreateIndex
CREATE INDEX "backups_type_idx" ON "backups"("type");

-- CreateIndex
CREATE INDEX "backups_status_idx" ON "backups"("status");

-- CreateIndex
CREATE INDEX "backups_createdAt_idx" ON "backups"("createdAt");

-- CreateIndex
CREATE INDEX "backup_schedules_enabled_idx" ON "backup_schedules"("enabled");

-- CreateIndex
CREATE INDEX "saved_views_entity_idx" ON "saved_views"("entity");

-- CreateIndex
CREATE INDEX "saved_views_createdBy_idx" ON "saved_views"("createdBy");

-- CreateIndex
CREATE INDEX "saved_views_isShared_idx" ON "saved_views"("isShared");

-- CreateIndex
CREATE INDEX "report_history_templateId_idx" ON "report_history"("templateId");

-- CreateIndex
CREATE INDEX "report_history_status_idx" ON "report_history"("status");

-- CreateIndex
CREATE INDEX "report_history_createdAt_idx" ON "report_history"("createdAt");

-- CreateIndex
CREATE INDEX "quality_alerts_characteristicId_idx" ON "quality_alerts"("characteristicId");

-- CreateIndex
CREATE INDEX "quality_alerts_status_idx" ON "quality_alerts"("status");

-- CreateIndex
CREATE INDEX "quality_alerts_severity_idx" ON "quality_alerts"("severity");

-- CreateIndex
CREATE INDEX "quality_alerts_type_idx" ON "quality_alerts"("type");

-- CreateIndex
CREATE INDEX "work_sessions_userId_status_idx" ON "work_sessions"("userId", "status");

-- CreateIndex
CREATE INDEX "work_sessions_userId_lastActivityAt_idx" ON "work_sessions"("userId", "lastActivityAt");

-- CreateIndex
CREATE INDEX "work_sessions_entityType_entityId_idx" ON "work_sessions"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "session_activities_sessionId_timestamp_idx" ON "session_activities"("sessionId", "timestamp");

-- AddForeignKey
ALTER TABLE "part_planning" ADD CONSTRAINT "part_planning_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_costs" ADD CONSTRAINT "part_costs_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_specs" ADD CONSTRAINT "part_specs_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_compliance" ADD CONSTRAINT "part_compliance_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_suppliers" ADD CONSTRAINT "part_suppliers_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_suppliers" ADD CONSTRAINT "part_suppliers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_alternates" ADD CONSTRAINT "part_alternates_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_alternates" ADD CONSTRAINT "part_alternates_alternatePartId_fkey" FOREIGN KEY ("alternatePartId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_documents" ADD CONSTRAINT "part_documents_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_revisions" ADD CONSTRAINT "part_revisions_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_costs_history" ADD CONSTRAINT "part_costs_history_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_certifications" ADD CONSTRAINT "part_certifications_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_defaultWorkCenterId_fkey" FOREIGN KEY ("defaultWorkCenterId") REFERENCES "work_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_headers" ADD CONSTRAINT "bom_headers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_lines" ADD CONSTRAINT "bom_lines_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "bom_headers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_lines" ADD CONSTRAINT "bom_lines_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_lines" ADD CONSTRAINT "shipment_lines_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_lines" ADD CONSTRAINT "shipment_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mrp_suggestions" ADD CONSTRAINT "mrp_suggestions_mrpRunId_fkey" FOREIGN KEY ("mrpRunId") REFERENCES "mrp_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mrp_suggestions" ADD CONSTRAINT "mrp_suggestions_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mrp_suggestions" ADD CONSTRAINT "mrp_suggestions_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_receipts" ADD CONSTRAINT "production_receipts_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_receipts" ADD CONSTRAINT "production_receipts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_receipts" ADD CONSTRAINT "production_receipts_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_allocations" ADD CONSTRAINT "material_allocations_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_allocations" ADD CONSTRAINT "material_allocations_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_forecasts" ADD CONSTRAINT "demand_forecasts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_time_predictions" ADD CONSTRAINT "lead_time_predictions_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_time_predictions" ADD CONSTRAINT "lead_time_predictions_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_risk_scores" ADD CONSTRAINT "supplier_risk_scores_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_plans" ADD CONSTRAINT "inspection_plans_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_plans" ADD CONSTRAINT "inspection_plans_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_plans" ADD CONSTRAINT "inspection_plans_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_characteristics" ADD CONSTRAINT "inspection_characteristics_planId_fkey" FOREIGN KEY ("planId") REFERENCES "inspection_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_planId_fkey" FOREIGN KEY ("planId") REFERENCES "inspection_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_results" ADD CONSTRAINT "inspection_results_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_results" ADD CONSTRAINT "inspection_results_characteristicId_fkey" FOREIGN KEY ("characteristicId") REFERENCES "inspection_characteristics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncrs" ADD CONSTRAINT "ncrs_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncrs" ADD CONSTRAINT "ncrs_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncrs" ADD CONSTRAINT "ncrs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncrs" ADD CONSTRAINT "ncrs_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncrs" ADD CONSTRAINT "ncrs_capaId_fkey" FOREIGN KEY ("capaId") REFERENCES "capas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_history" ADD CONSTRAINT "ncr_history_ncrId_fkey" FOREIGN KEY ("ncrId") REFERENCES "ncrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_actions" ADD CONSTRAINT "capa_actions_capaId_fkey" FOREIGN KEY ("capaId") REFERENCES "capas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_history" ADD CONSTRAINT "capa_history_capaId_fkey" FOREIGN KEY ("capaId") REFERENCES "capas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_transactions" ADD CONSTRAINT "lot_transactions_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_transactions" ADD CONSTRAINT "lot_transactions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrap_disposals" ADD CONSTRAINT "scrap_disposals_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates_of_conformance" ADD CONSTRAINT "certificates_of_conformance_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates_of_conformance" ADD CONSTRAINT "certificates_of_conformance_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates_of_conformance" ADD CONSTRAINT "certificates_of_conformance_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routings" ADD CONSTRAINT "routings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_operations" ADD CONSTRAINT "routing_operations_routingId_fkey" FOREIGN KEY ("routingId") REFERENCES "routings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_operations" ADD CONSTRAINT "routing_operations_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_operations" ADD CONSTRAINT "work_order_operations_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_operations" ADD CONSTRAINT "work_order_operations_routingOperationId_fkey" FOREIGN KEY ("routingOperationId") REFERENCES "routing_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_operations" ADD CONSTRAINT "work_order_operations_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_operations" ADD CONSTRAINT "scheduled_operations_workOrderOperationId_fkey" FOREIGN KEY ("workOrderOperationId") REFERENCES "work_order_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_operations" ADD CONSTRAINT "scheduled_operations_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_records" ADD CONSTRAINT "capacity_records_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_entries" ADD CONSTRAINT "labor_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_entries" ADD CONSTRAINT "labor_entries_workOrderOperationId_fkey" FOREIGN KEY ("workOrderOperationId") REFERENCES "work_order_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_entries" ADD CONSTRAINT "labor_entries_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downtime_records" ADD CONSTRAINT "downtime_records_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electronic_signatures" ADD CONSTRAINT "electronic_signatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_devices" ADD CONSTRAINT "mfa_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_challenges" ADD CONSTRAINT "mfa_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_challenges" ADD CONSTRAINT "mfa_challenges_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "mfa_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itar_access_logs" ADD CONSTRAINT "itar_access_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itar_access_logs" ADD CONSTRAINT "itar_access_logs_controlledItemId_fkey" FOREIGN KEY ("controlledItemId") REFERENCES "itar_controlled_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gl_accounts" ADD CONSTRAINT "gl_accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "gl_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_types" ADD CONSTRAINT "cost_types_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "gl_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_cost_components" ADD CONSTRAINT "part_cost_components_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_cost_components" ADD CONSTRAINT "part_cost_components_costTypeId_fkey" FOREIGN KEY ("costTypeId") REFERENCES "cost_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_cost_rollups" ADD CONSTRAINT "part_cost_rollups_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_costs" ADD CONSTRAINT "work_order_costs_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_costs" ADD CONSTRAINT "work_order_costs_costTypeId_fkey" FOREIGN KEY ("costTypeId") REFERENCES "cost_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "purchase_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "purchase_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "sales_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "sales_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "gl_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_variances" ADD CONSTRAINT "cost_variances_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_variances" ADD CONSTRAINT "cost_variances_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_fromCurrencyId_fkey" FOREIGN KEY ("fromCurrencyId") REFERENCES "currencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_devices" ADD CONSTRAINT "mobile_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_list_lines" ADD CONSTRAINT "pick_list_lines_pickListId_fkey" FOREIGN KEY ("pickListId") REFERENCES "pick_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_list_lines" ADD CONSTRAINT "pick_list_lines_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_list_lines" ADD CONSTRAINT "pick_list_lines_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_sites" ADD CONSTRAINT "inventory_sites_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_sites" ADD CONSTRAINT "inventory_sites_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_fromSiteId_fkey" FOREIGN KEY ("fromSiteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_toSiteId_fkey" FOREIGN KEY ("toSiteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_lines" ADD CONSTRAINT "transfer_order_lines_transferOrderId_fkey" FOREIGN KEY ("transferOrderId") REFERENCES "transfer_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_lines" ADD CONSTRAINT "transfer_order_lines_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_orders" ADD CONSTRAINT "planned_orders_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_orders" ADD CONSTRAINT "planned_orders_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_orders" ADD CONSTRAINT "planned_orders_demandSiteId_fkey" FOREIGN KEY ("demandSiteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mrp_exceptions" ADD CONSTRAINT "mrp_exceptions_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_results" ADD CONSTRAINT "simulation_results_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atp_records" ADD CONSTRAINT "atp_records_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_substitutes" ADD CONSTRAINT "part_substitutes_primaryPartId_fkey" FOREIGN KEY ("primaryPartId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_substitutes" ADD CONSTRAINT "part_substitutes_substitutePartId_fkey" FOREIGN KEY ("substitutePartId") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_orders" ADD CONSTRAINT "maintenance_orders_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "maintenance_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_skills" ADD CONSTRAINT "employee_skills_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_skills" ADD CONSTRAINT "employee_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_center_capacity" ADD CONSTRAINT "work_center_capacity_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantInvitation" ADD CONSTRAINT "TenantInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApiKey" ADD CONSTRAINT "TenantApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "conversation_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_participants" ADD CONSTRAINT "thread_participants_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "conversation_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_participants" ADD CONSTRAINT "thread_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_edit_history" ADD CONSTRAINT "message_edit_history_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_links" ADD CONSTRAINT "entity_links_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_initiatedBy_fkey" FOREIGN KEY ("initiatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "workflow_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_delegatedTo_fkey" FOREIGN KEY ("delegatedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_notifications" ADD CONSTRAINT "workflow_notifications_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_notifications" ADD CONSTRAINT "workflow_notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_dashboards" ADD CONSTRAINT "analytics_dashboards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "analytics_dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "saved_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_instances" ADD CONSTRAINT "report_instances_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "report_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_instances" ADD CONSTRAINT "report_instances_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "saved_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_sessions" ADD CONSTRAINT "import_sessions_importedBy_fkey" FOREIGN KEY ("importedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_logs" ADD CONSTRAINT "import_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "import_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_mappings" ADD CONSTRAINT "import_mappings_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_alerts" ADD CONSTRAINT "quality_alerts_characteristicId_fkey" FOREIGN KEY ("characteristicId") REFERENCES "inspection_characteristics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_activities" ADD CONSTRAINT "session_activities_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "work_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
