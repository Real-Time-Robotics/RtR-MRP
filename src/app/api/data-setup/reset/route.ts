// src/app/api/data-setup/reset/route.ts
// Resets all master/transactional data, preserving User and SystemSetting records

import { NextRequest, NextResponse } from "next/server";
import { withRoleAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";

export const POST = withRoleAuth(["admin"], async (request: NextRequest) => {
  const body = await request.json();

  if (body.confirm !== "RESET") {
    return NextResponse.json(
      { error: 'Confirmation required: send { confirm: "RESET" }' },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      // === Layer 1: Deep transactional / leaf tables ===
      // Quality
      await tx.cAPAHistory.deleteMany();
      await tx.cAPAAction.deleteMany();
      await tx.cAPA.deleteMany();
      await tx.nCRHistory.deleteMany();
      await tx.nCR.deleteMany();
      await tx.inspectionResult.deleteMany();
      await tx.inspection.deleteMany();
      await tx.inspectionCharacteristic.deleteMany();
      await tx.inspectionPlan.deleteMany();
      await tx.certificateOfConformance.deleteMany();
      await tx.scrapDisposal.deleteMany();
      await tx.defectCode.deleteMany();
      await tx.qualityAlert.deleteMany();

      // Production deep
      await tx.laborEntry.deleteMany();
      await tx.downtimeRecord.deleteMany();
      await tx.scheduledOperation.deleteMany();
      await tx.workOrderOperation.deleteMany();
      await tx.workOrderCost.deleteMany();
      await tx.materialAllocation.deleteMany();
      await tx.productionReceipt.deleteMany();
      await tx.workOrder.deleteMany();
      await tx.routingOperation.deleteMany();
      await tx.routing.deleteMany();

      // Sales deep
      await tx.shipmentLine.deleteMany();
      await tx.shipment.deleteMany();
      await tx.salesInvoiceLine.deleteMany();
      await tx.salesPayment.deleteMany();
      await tx.salesInvoice.deleteMany();
      await tx.salesOrderLine.deleteMany();
      await tx.salesOrder.deleteMany();
      await tx.quotationItem.deleteMany();
      await tx.quotation.deleteMany();
      await tx.pricingRule.deleteMany();

      // Purchasing deep
      await tx.threeWayMatch.deleteMany();
      await tx.gRNItem.deleteMany();
      await tx.goodsReceiptNote.deleteMany();
      await tx.purchaseInvoiceLine.deleteMany();
      await tx.purchasePayment.deleteMany();
      await tx.purchaseInvoice.deleteMany();
      await tx.purchaseOrderLine.deleteMany();
      await tx.purchaseOrder.deleteMany();

      // MRP / Planning
      await tx.simulationResult.deleteMany();
      await tx.simulation.deleteMany();
      await tx.mRPException.deleteMany();
      await tx.plannedOrder.deleteMany();
      await tx.peggingRecord.deleteMany();
      await tx.aTPRecord.deleteMany();
      await tx.mrpSuggestion.deleteMany();
      await tx.mrpRun.deleteMany();
      await tx.demandForecast.deleteMany();
      await tx.leadTimePrediction.deleteMany();

      // Finance
      await tx.journalLine.deleteMany();
      await tx.journalEntry.deleteMany();
      await tx.costVariance.deleteMany();
      await tx.partCostComponent.deleteMany();
      await tx.partCostRollup.deleteMany();

      // Multi-site
      await tx.transferOrderLine.deleteMany();
      await tx.transferOrder.deleteMany();
      await tx.inventorySite.deleteMany();
      await tx.pickListLine.deleteMany();
      await tx.pickList.deleteMany();

      // Lot tracking
      await tx.lotTransaction.deleteMany();

      // AI
      await tx.aiRecommendation.deleteMany();
      await tx.aiModelLog.deleteMany();
      await tx.supplierRiskScore.deleteMany();

      // Cost optimization
      await tx.savingsRecord.deleteMany();
      await tx.substituteEvaluation.deleteMany();
      await tx.makeVsBuyAnalysis.deleteMany();
      await tx.partAutonomyStatus.deleteMany();
      await tx.costReductionAction.deleteMany();
      await tx.costReductionPhase.deleteMany();
      await tx.costTarget.deleteMany();

      // Barcode / Mobile
      await tx.scanLog.deleteMany();
      await tx.offlineOperation.deleteMany();

      // Discussions
      await tx.messageEditHistory.deleteMany();
      await tx.messageAttachment.deleteMany();
      await tx.mention.deleteMany();
      await tx.entityLink.deleteMany();
      await tx.message.deleteMany();
      await tx.threadParticipant.deleteMany();
      await tx.conversationThread.deleteMany();

      // Workflow
      await tx.workflowNotification.deleteMany();
      await tx.workflowHistory.deleteMany();
      await tx.workflowApproval.deleteMany();
      await tx.workflowInstance.deleteMany();

      // Import/Export history
      await tx.importRow.deleteMany();
      await tx.importJob.deleteMany();
      await tx.importLog.deleteMany();
      await tx.importSession.deleteMany();
      await tx.importMapping.deleteMany();
      await tx.exportJob.deleteMany();
      await tx.migrationBatch.deleteMany();

      // Audit/Activity
      await tx.auditLog.deleteMany();
      await tx.activityLog.deleteMany();
      await tx.auditTrailEntry.deleteMany();
      await tx.electronicSignature.deleteMany();

      // Reports/Analytics
      await tx.reportInstance.deleteMany();
      await tx.reportHistory.deleteMany();

      // Work sessions
      await tx.sessionActivity.deleteMany();
      await tx.workSession.deleteMany();

      // === Layer 2: Tier 3 master data ===
      await tx.inventory.deleteMany();
      await tx.bomLine.deleteMany();
      await tx.bomHeader.deleteMany();
      await tx.partSupplier.deleteMany();
      await tx.partSubstitute.deleteMany();
      await tx.partAlternate.deleteMany();

      // === Layer 3: Tier 2 master data ===
      // Part cascade children
      await tx.partDocument.deleteMany();
      await tx.partRevision.deleteMany();
      await tx.partCertification.deleteMany();
      await tx.partCostHistory.deleteMany();
      await tx.partCompliance.deleteMany();
      await tx.partSpecs.deleteMany();
      await tx.partCost.deleteMany();
      await tx.partPlanning.deleteMany();
      await tx.part.deleteMany();
      await tx.product.deleteMany();

      // === Layer 4: Tier 1 master data ===
      await tx.customerContact.deleteMany();
      await tx.customer.deleteMany();
      await tx.supplierScore.deleteMany();
      await tx.supplierAudit.deleteMany();
      await tx.supplier.deleteMany();
      await tx.warehouse.deleteMany();
    }, { timeout: 60000 });

    return NextResponse.json({ success: true, message: "All data reset successfully" });
  } catch (error) {
    console.error("Reset failed:", error);
    return NextResponse.json(
      { error: "Reset failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
