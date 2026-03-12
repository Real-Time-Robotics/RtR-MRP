import prisma from '../prisma';
import { MrpJobData } from '../queue/mrp.queue';
import { logger } from '@/lib/logger';

interface NettingResult {
    partId: string;
    grossReq: number;
    netReq: number;
    plannedOrderRelease: Date;
    suggestions: Array<{ type: string; partId: string; quantity: number; dueDate: Date; message: string }>;
}

/** Shape of a Part row returned by our specific select query (with planning + inventory) */
interface MrpPartRow {
    id: string;
    partNumber: string;
    makeOrBuy: string;
    moq: number;
    planning: { leadTimeDays: number; safetyStock: number; orderMultiple: number; minStockLevel: number; moq: number } | null;
    inventory: Array<{ quantity: number; reservedQty: number; warehouseId: string }>;
}

/** Warehouse types where stock is NOT available for MRP netting */
const EXCLUDED_WAREHOUSE_TYPES = new Set(['QUARANTINE', 'HOLD', 'SCRAP']);

/** Default lead time (days) when part has no planning data or leadTimeDays = 0 (L-01) */
const DEFAULT_LEAD_TIME_DAYS = 14;

export class MrpEngine {
    private runId: string;
    private params: MrpJobData;

    constructor(runId: string, params: MrpJobData) {
        this.runId = runId;
        this.params = params;
    }

    async execute() {

        // 1. Fetch all active BOMs and Parts (In-memory graph for speed)
        // For 10k parts, this is manageable. Optimization: Select only needed fields.

        // Fetch parts with planning data and makeOrBuy classification
        const parts: MrpPartRow[] = await (prisma.part.findMany as unknown as (...args: unknown[]) => Promise<MrpPartRow[]>)({
            select: {
                id: true,
                partNumber: true,
                makeOrBuy: true,
                moq: true,
                planning: {
                    select: { leadTimeDays: true, safetyStock: true, orderMultiple: true, minStockLevel: true, moq: true }
                },
                inventory: {
                    select: { quantity: true, reservedQty: true, warehouseId: true }
                }
            }
        });

        // Fetch warehouse types to filter non-available stock (S-01/S-02)
        const warehouses = await prisma.warehouse.findMany({
            select: { id: true, type: true }
        });
        const excludedWarehouseIds = new Set(
            warehouses.filter(w => w.type && EXCLUDED_WAREHOUSE_TYPES.has(w.type)).map(w => w.id)
        );

        // Fetch part-supplier links for supplier validation (P-01, P-05, S-06)
        const partSuppliers = await prisma.partSupplier.findMany({
            select: { partId: true, supplierId: true }
        });
        const partSupplierMap = new Map<string, string>();
        const partSupplierCount = new Map<string, number>();
        for (const ps of partSuppliers) {
            if (!partSupplierMap.has(ps.partId)) {
                partSupplierMap.set(ps.partId, ps.supplierId);
            }
            partSupplierCount.set(ps.partId, (partSupplierCount.get(ps.partId) || 0) + 1);
        }

        // Fetch supplier statuses for inactive supplier detection (S-06)
        const suppliers = await prisma.supplier.findMany({
            select: { id: true, status: true }
        });
        const supplierStatusMap = new Map(suppliers.map(s => [s.id, s.status]));

        // Create helper map for quick part lookup
        const partMap = new Map<string, MrpPartRow>(parts.map(p => [p.id, p]));

        // Fetch all BOMs to build the graph
        const boms = await prisma.bomHeader.findMany({
            where: { status: 'active' },
            include: {
                bomLines: true
            }
        });

        // Fetch all BOMs (including draft) to detect products with only draft BOMs (B-01)
        const allBoms = await prisma.bomHeader.findMany({
            select: { id: true, productId: true, status: true }
        });
        // Track products that have BOMs but none are active
        const productBomStatuses = new Map<string, Set<string>>();
        for (const b of allBoms) {
            if (!productBomStatuses.has(b.productId)) productBomStatuses.set(b.productId, new Set());
            productBomStatuses.get(b.productId)?.add(b.status);
        }

        // Also fetch Product-to-SKU mapping if needed, but BOMs link to ProductId
        // We need to map ProductId -> PartId if they are different, or treat Product as a Node.
        // In our Seed Script, Product and Part share SKU/PartNumber logic or we link them.
        // For this logic, let's assume the BOM ProductId corresponds to a "Part" node (via SKU matching or ID if unified).

        // 2. Build Dependency Graph & Calculate Low Level Code (LLC)
        // Graph: Parent -> Children
        const bomGraph = new Map<string, Array<{ childId: string, qty: number, scrap: number }>>();

        // If Product ID != Part ID, we need a bridge. 
        // Current Schema: BomHeader.productId -> Product.
        // BomLine.partId -> Part.
        // The "Network" connects Products and Parts. 
        // We need to know which Part ID corresponds to the BomHeader.productId.
        // Let's resolve that by fetching Products and finding matching Parts by SKU/PartNumber.

        const products = await prisma.product.findMany({ select: { id: true, sku: true, name: true } });
        const productSkuMap = new Map(products.map(p => [p.id, p.sku]));
        const productNameMap = new Map(products.map(p => [p.sku, p.name]));

        // Map SKU to Part ID for bridging
        const skuToPartId = new Map(parts.map(p => [p.partNumber, p.id]));

        // Auto-create missing Part records for Products that have no matching Part
        for (const product of products) {
            if (!skuToPartId.has(product.sku)) {
                logger.warn('MRP auto-creating Part for Product without matching Part record', {
                    context: 'mrp-core',
                    productId: product.id,
                    productSku: product.sku,
                    mrpRunId: this.runId,
                });
                const newPart = await prisma.part.create({
                    data: {
                        partNumber: product.sku,
                        name: product.name,
                        category: "FINISHED_GOOD",
                        description: `Thành phẩm: ${product.name}`,
                        makeOrBuy: "MAKE",
                        status: "active",
                    },
                });
                skuToPartId.set(product.sku, newPart.id);
                partMap.set(newPart.id, { id: newPart.id, partNumber: newPart.partNumber, makeOrBuy: 'MAKE', moq: 1, planning: null, inventory: [] });
            }
        }

        for (const bom of boms) {
            const productSku = productSkuMap.get(bom.productId);
            if (!productSku) continue;

            const parentPartId = skuToPartId.get(productSku);
            if (!parentPartId) continue;

            if (!bomGraph.has(parentPartId)) bomGraph.set(parentPartId, []);

            for (const line of bom.bomLines) {
                bomGraph.get(parentPartId)?.push({
                    childId: line.partId,
                    qty: line.quantity,
                    scrap: line.scrapRate
                });
            }
        }

        // 3. Calculate Low-Level Code (LLC)
        // LLC: 0 = Finished Good. Higher number = Lower in BOM.
        // If A -> B -> C, LLC(A)=0, LLC(B)=1, LLC(C)=2.
        // Algorithm: Initialize all to 0. BFS/DFS to propagate depths.
        const llcMap = new Map<string, number>();
        // Initialize all parts (original + auto-created) to level 0
        for (const [partId] of partMap) {
            llcMap.set(partId, 0);
        }

        let changed = true;
        let loops = 0;
        while (changed && loops < 100) { // Limit loops to prevent infinite cycle hang
            changed = false;
            loops++;
            for (const [parentId, children] of Array.from(bomGraph.entries())) {
                const parentLevel = llcMap.get(parentId) || 0;
                for (const child of children) {
                    const currentChildLevel = llcMap.get(child.childId) || 0;
                    if (currentChildLevel < parentLevel + 1) {
                        llcMap.set(child.childId, parentLevel + 1);
                        changed = true;
                    }
                }
            }
        }
        if (loops >= 100) {
            logger.warn("Possible BOM Cycle detected! LLC calculation did not converge.", { context: 'mrp-core', mrpRunId: this.runId });
            // Create an MRP exception for cycle detection (B-03)
            // Find a part involved in the cycle (one whose LLC is still changing)
            const cycleParts = Array.from(bomGraph.keys());
            const cyclePartId = cycleParts[0] || parts[0]?.id;
            if (cyclePartId) {
                try {
                    await prisma.mRPException.create({
                        data: {
                            mrpRunId: this.runId,
                            exceptionType: 'BOM_CYCLE',
                            severity: 'CRITICAL',
                            entityType: 'BOM',
                            entityId: this.runId,
                            partId: cyclePartId,
                            message: 'BOM cycle detected: LLC calculation did not converge after 100 iterations. Check BOM structure for circular references.',
                        }
                    });
                } catch (e) {
                    logger.warn("Could not create MRP exception for cycle detection", { context: 'mrp-core', error: String(e) });
                }
            }
        }

        // 4. Organize Parts by Level
        const partsByLevel = new Map<number, string[]>();
        let maxLevel = 0;
        for (const [partId, level] of Array.from(llcMap.entries())) {
            if (!partsByLevel.has(level)) partsByLevel.set(level, []);
            partsByLevel.get(level)?.push(partId);
            if (level > maxLevel) maxLevel = level;
        }

        // 5. Get Initial Demand (Sales Orders)
        // We only care about confirmed orders for now
        const demands = await prisma.salesOrderLine.findMany({
            where: {
                order: { status: { in: ['confirmed', 'in_production'] } }
            },
            include: { order: true, product: true }
        });

        // 6. Process Levels (0 to maxLevel)
        // Gross Requirements stored as Map<PartId, ListOfReqs>
        const grossRequirements = new Map<string, Array<{ date: Date, qty: number, source: string }>>();

        // Helper to add requirement
        const addRequirement = (partId: string, qty: number, date: Date, source: string) => {
            if (!grossRequirements.has(partId)) grossRequirements.set(partId, []);
            grossRequirements.get(partId)?.push({ date, qty, source });
        };

        // Initialize Level 0 Demand from Sales Orders
        for (const d of demands) {
            // Map Product -> Part
            const partId = skuToPartId.get(d.product.sku);
            if (partId) {
                addRequirement(partId, d.quantity, d.order.requiredDate, `SO-${d.order.orderNumber}`);
            }
        }

        interface MrpSuggestionInput {
            mrpRunId: string;
            partId: string;
            actionType: string;
            status: string;
            priority: string;
            suggestedQty: number;
            suggestedDate: Date;
            reason: string;
            currentStock?: number;
            requiredQty?: number;
            shortageQty?: number;
            supplierId?: string | null;
        }
        const suggestionsToCreate: MrpSuggestionInput[] = [];
        const exceptionsToCreate: Array<{
            mrpRunId: string;
            exceptionType: string;
            severity: string;
            entityType: string;
            entityId: string;
            partId: string;
            message: string;
        }> = [];
        const mrpRunDate = new Date();

        // B-01: Check for demand-bearing products with only draft BOMs
        for (const d of demands) {
            const product = products.find(p => p.id === d.productId);
            if (!product) continue;
            const bomStatuses = productBomStatuses.get(product.id);
            if (bomStatuses && !bomStatuses.has('active') && bomStatuses.has('draft')) {
                const partId = skuToPartId.get(product.sku);
                if (partId) {
                    if (!exceptionsToCreate.some(e => e.exceptionType === 'DRAFT_BOM_ONLY' && e.partId === partId)) {
                        exceptionsToCreate.push({
                            mrpRunId: this.runId,
                            exceptionType: 'DRAFT_BOM_ONLY',
                            severity: 'WARNING',
                            entityType: 'BOM',
                            entityId: product.id,
                            partId: partId,
                            message: `Product ${product.sku} has demand but only draft BOM(s). No BOM explosion will occur. Activate the BOM to enable MRP planning.`,
                        });
                    }
                }
            }
        }

        // --- SCHEDULED RECEIPTS: Aggregate open PO quantities per part ---
        const poLines = await prisma.purchaseOrderLine.findMany({
            where: {
                po: { status: { in: ['confirmed', 'in_progress'] } },
            },
            select: {
                partId: true,
                quantity: true,
                receivedQty: true,
            },
        });

        // Map: partId → total open PO quantity (ordered but not yet received)
        const scheduledReceipts = new Map<string, number>();
        for (const line of poLines) {
            const openQty = line.quantity - line.receivedQty;
            if (openQty > 0) {
                scheduledReceipts.set(
                    line.partId,
                    (scheduledReceipts.get(line.partId) || 0) + openQty
                );
            }
        }

        // --- MAIN CALCULATION LOOP ---
        for (let level = 0; level <= maxLevel; level++) {
            const levelParts = partsByLevel.get(level) || [];

            for (const partId of levelParts) {
                const partReqs = grossRequirements.get(partId) || [];
                if (partReqs.length === 0 && (partMap.get(partId)?.planning?.safetyStock || 0) <= 0) continue;

                const part = partMap.get(partId);
                if (!part) continue;

                // Calculate Total Demand
                const totalGross = partReqs.reduce((sum, r) => sum + r.qty, 0);

                // Calculate Inventory — exclude QUARANTINE, HOLD, SCRAP warehouses (S-01/S-02)
                const totalStock = part.inventory.reduce((sum: number, inv: { quantity: number; reservedQty: number; warehouseId: string }) => {
                    if (excludedWarehouseIds.has(inv.warehouseId)) return sum; // Skip non-available stock
                    return sum + inv.quantity - inv.reservedQty;
                }, 0);

                const safetyStock = part.planning?.safetyStock || 0;
                const rawLeadTime = part.planning?.leadTimeDays || 0;
                const leadTime = rawLeadTime > 0 ? rawLeadTime : DEFAULT_LEAD_TIME_DAYS;
                const onOrder = scheduledReceipts.get(partId) || 0;

                // L-01: Warn if no lead time defined (using default)
                if (rawLeadTime <= 0 && totalGross > 0) {
                    exceptionsToCreate.push({
                        mrpRunId: this.runId,
                        exceptionType: 'MISSING_LEAD_TIME',
                        severity: 'WARNING',
                        entityType: 'PART',
                        entityId: partId,
                        partId: partId,
                        message: `Part ${part.partNumber} has no lead time defined. Using default ${DEFAULT_LEAD_TIME_DAYS} days. Update PartPlanning to set accurate lead time.`,
                    });
                }

                // Net = Gross + SafetyStock - Stock - OnOrder (from confirmed POs)
                const netRequired = Math.max(0, (totalGross + safetyStock) - totalStock - onOrder);

                if (netRequired > 0) {
                    // Apply MOQ and order multiple rounding
                    const moq = part.planning?.moq || part.moq || 1;
                    const orderMultiple = part.planning?.orderMultiple || 1;
                    const minStockLevel = part.planning?.minStockLevel || 0;
                    let suggestedQty = netRequired;

                    // Enforce MOQ: suggested quantity must be at least MOQ
                    if (moq > 1 && suggestedQty < moq) {
                        suggestedQty = moq;
                    }

                    // Round up to nearest order multiple
                    if (orderMultiple > 1) {
                        suggestedQty = Math.ceil(suggestedQty / orderMultiple) * orderMultiple;
                    }

                    // Ensure at least the minimum stock level
                    if (minStockLevel > 0 && suggestedQty < minStockLevel) {
                        suggestedQty = Math.ceil(minStockLevel / orderMultiple) * orderMultiple;
                    }

                    // Final MOQ check after all rounding (ensure MOQ is still respected)
                    if (moq > 1 && suggestedQty < moq) {
                        suggestedQty = Math.ceil(moq / orderMultiple) * orderMultiple;
                    }

                    // Determine action type based on makeOrBuy (D-01 fix)
                    const isMakeItem = part.makeOrBuy === 'MAKE';
                    const actionType = isMakeItem ? 'MANUFACTURE' : 'PURCHASE';

                    // Determine suggested order date
                    const suggestedDate = new Date(mrpRunDate.getTime() + leadTime * 86400000);

                    // Detect past-due: earliest requirement date is before suggested date (L-04)
                    const earliestReqDate = partReqs.length > 0
                        ? partReqs.reduce((min, r) => r.date < min ? r.date : min, partReqs[0].date)
                        : suggestedDate;
                    const isPastDue = earliestReqDate < mrpRunDate;

                    // Resolve supplier for BUY parts (P-01)
                    const supplierId = partSupplierMap.get(partId) || null;
                    const supplierCount = partSupplierCount.get(partId) || 0;
                    const warnings: string[] = [];

                    if (!isMakeItem && !supplierId) {
                        warnings.push('WARNING: No supplier assigned');
                    }

                    // P-05: Single source risk
                    if (!isMakeItem && supplierCount === 1) {
                        warnings.push('WARNING: Single source — supply risk');
                    }

                    // S-06: Inactive supplier
                    if (supplierId) {
                        const supplierStatus = supplierStatusMap.get(supplierId);
                        if (supplierStatus && supplierStatus !== 'active') {
                            warnings.push(`WARNING: Supplier is ${supplierStatus}`);
                            exceptionsToCreate.push({
                                mrpRunId: this.runId,
                                exceptionType: 'INACTIVE_SUPPLIER',
                                severity: 'WARNING',
                                entityType: 'SUPPLIER',
                                entityId: supplierId,
                                partId: partId,
                                message: `Part ${part.partNumber} primary supplier is ${supplierStatus}. Find an alternative or reactivate.`,
                            });
                        }
                    }

                    const warningStr = warnings.length > 0 ? ' | ' + warnings.join(' | ') : '';

                    suggestionsToCreate.push({
                        mrpRunId: this.runId,
                        partId: partId,
                        actionType: isPastDue ? 'EXPEDITE' : actionType,
                        status: 'pending',
                        priority: isPastDue ? 'CRITICAL' : 'HIGH',
                        suggestedQty: suggestedQty,
                        suggestedDate: suggestedDate,
                        currentStock: totalStock,
                        requiredQty: totalGross,
                        shortageQty: netRequired,
                        supplierId: supplierId,
                        reason: `Gross: ${totalGross}, Stock: ${totalStock}, OnOrder: ${onOrder}, SS: ${safetyStock}, MOQ: ${moq}, OrderMultiple: ${orderMultiple}, Type: ${actionType}${warningStr}`
                    });
                }

                // EXPLODE Dependencies (Pass demand to next level)
                // Always explode gross demand to children regardless of parent stock.
                // Even if the parent has enough stock, fulfilling the order consumes that stock,
                // so children (sub-assemblies/components) still need to be available.
                if (totalGross > 0) {
                    const children = bomGraph.get(partId);
                    if (children && children.length > 0) {
                        for (const child of children) {
                            const childReqQty = totalGross * child.qty * (1 + (child.scrap || 0)); // Explode with scrap factor (B-07)
                            addRequirement(
                                child.childId,
                                childReqQty,
                                new Date(),
                                `Parent-${part.partNumber}`
                            );
                        }
                    } else if (part.makeOrBuy === 'MAKE') {
                        // B-04: MAKE part with demand but no BOM — cannot explode
                        exceptionsToCreate.push({
                            mrpRunId: this.runId,
                            exceptionType: 'MAKE_NO_BOM',
                            severity: 'CRITICAL',
                            entityType: 'PART',
                            entityId: partId,
                            partId: partId,
                            message: `MAKE part ${part.partNumber} has demand (${totalGross}) but no active BOM. Cannot explode to components. Create or activate BOM.`,
                        });
                    }
                }
            }
        }

        // 7. Bulk Insert
        if (suggestionsToCreate.length > 0) {
            await prisma.mrpSuggestion.createMany({
                data: suggestionsToCreate
            });
        }

        // 7b. Bulk insert MRP exceptions
        if (exceptionsToCreate.length > 0) {
            try {
                await prisma.mRPException.createMany({ data: exceptionsToCreate });
            } catch (e) {
                logger.warn('Failed to create MRP exceptions', { context: 'mrp-core', error: String(e), count: exceptionsToCreate.length });
            }
        }

        // 8. Update MRP Run with counts
        const purchaseCount = suggestionsToCreate.filter(s => s.actionType === 'PURCHASE').length;
        const manufactureCount = suggestionsToCreate.filter(s => s.actionType === 'MANUFACTURE').length;
        const expediteCount = suggestionsToCreate.filter(s => s.actionType === 'EXPEDITE').length;
        await prisma.mrpRun.update({
            where: { id: this.runId },
            data: {
                totalParts: grossRequirements.size,
                purchaseSuggestions: purchaseCount + manufactureCount,
                expediteAlerts: expediteCount,
            },
        });

        logger.info(`MRP Run complete: ${purchaseCount} purchase, ${manufactureCount} manufacture, ${expediteCount} expedite, ${exceptionsToCreate.length} exceptions`, { context: 'mrp-core', mrpRunId: this.runId });

        return { success: true, suggestionsCount: suggestionsToCreate.length };
    }
}
