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
    planning: { leadTimeDays: number; safetyStock: number; orderMultiple: number; minStockLevel: number } | null;
    inventory: Array<{ quantity: number; reservedQty: number; warehouseId: string }>;
}

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

        // Fetch parts with planning data
        const parts: MrpPartRow[] = await (prisma.part.findMany as Function)({
            select: {
                id: true,
                partNumber: true,
                planning: {
                    select: { leadTimeDays: true, safetyStock: true, orderMultiple: true, minStockLevel: true }
                },
                inventory: {
                    select: { quantity: true, reservedQty: true, warehouseId: true }
                }
            }
        });

        // Create helper map for quick part lookup
        const partMap = new Map<string, MrpPartRow>(parts.map(p => [p.id, p]));

        // Fetch all BOMs to build the graph
        const boms = await prisma.bomHeader.findMany({
            where: { status: 'active' },
            include: {
                bomLines: true
            }
        });

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
                partMap.set(newPart.id, { id: newPart.id, partNumber: newPart.partNumber, planning: null, inventory: [] });
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
        if (loops >= 100) logger.warn("Possible BOM Cycle detected!", { context: 'mrp-core' });

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
        }
        const suggestionsToCreate: MrpSuggestionInput[] = [];
        const mrpRunDate = new Date();

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

                // Calculate Inventory
                // Sum all warehouses for now
                const totalStock = part.inventory.reduce((sum: number, inv: { quantity: number; reservedQty: number }) => sum + inv.quantity - inv.reservedQty, 0);

                const safetyStock = part.planning?.safetyStock || 0;
                const leadTime = part.planning?.leadTimeDays || 0;

                const netRequired = Math.max(0, (totalGross + safetyStock) - totalStock);

                if (netRequired > 0) {
                    // Create Suggestion (Planned Order)
                    const suggestedDate = new Date(mrpRunDate);
                    // Logic: For simplest case, take earliest demand date - lead time.
                    // A proper implementation buckets by date. We aggregate "Bucketless" here for Phase 1.

                    suggestionsToCreate.push({
                        mrpRunId: this.runId,
                        partId: partId,
                        actionType: 'PURCHASE', // Or MAKE, based on Make/Buy flag. Default to Purchase for test.
                        status: 'pending',
                        priority: 'HIGH',
                        suggestedQty: netRequired,
                        suggestedDate: new Date(new Date().setDate(new Date().getDate() + leadTime)),
                        reason: `Gross: ${totalGross}, Stock: ${totalStock}, SS: ${safetyStock}`
                    });

                    // EXPLODE Dependencies (Pass demand to next level)
                    const children = bomGraph.get(partId);
                    if (children && children.length > 0) {
                        for (const child of children) {
                            const childReqQty = netRequired * child.qty; // Explode based on PLANNED ORDER, not Gross.
                            // Add to Gross Reqs of child
                            addRequirement(
                                child.childId,
                                childReqQty,
                                new Date(), // Should be PlannedOrderReleaseDate
                                `Parent-${part.partNumber}`
                            );
                        }
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

        // 8. Update MRP Run with counts
        const purchaseCount = suggestionsToCreate.filter(s => s.actionType === 'PURCHASE').length;
        const expediteCount = suggestionsToCreate.filter(s => s.actionType === 'EXPEDITE').length;
        await prisma.mrpRun.update({
            where: { id: this.runId },
            data: {
                totalParts: grossRequirements.size,
                purchaseSuggestions: purchaseCount,
                expediteAlerts: expediteCount,
            },
        });

        return { success: true, suggestionsCount: suggestionsToCreate.length };
    }
}
