import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting MRP Test Seeding...');

    // --- CLEANUP ---
    console.log('🧹 Cleaning old test data...');
    try {
        const pA = await prisma.product.findUnique({ where: { sku: 'TEST-PROD-A' } });
        if (pA) await prisma.product.delete({ where: { id: pA.id } });

        const pB = await prisma.product.findUnique({ where: { sku: 'TEST-SUB-B' } });
        if (pB) await prisma.product.delete({ where: { id: pB.id } });

        await prisma.part.deleteMany({
            where: {
                partNumber: { in: ['TEST-PROD-A', 'TEST-SUB-B', 'TEST-RAW-C'] }
            }
        });
    } catch (e) { console.error('Cleanup warning:', e); }

    // --- CREATE PARTS (Inventory Trackers) ---
    console.log('🛠 Creating Parts...');

    // 1. Raw Material C
    const rawC = await prisma.part.create({
        data: {
            partNumber: 'TEST-RAW-C',
            name: 'Test Raw Material C',
            category: 'RAW_MATERIAL',
            status: 'active',
            costs: { create: { unitCost: 5.0 } },
            planning: { create: { leadTimeDays: 5, safetyStock: 0 } },
            inventory: {
                create: {
                    warehouse: {
                        connectOrCreate: {
                            where: { code: 'MAIN' },
                            create: { code: 'MAIN', name: 'Main Warehouse' }
                        }
                    },
                    quantity: 100, // Stock: 100
                }
            }
        }
    });

    // 2. Sub Assembly B
    const subB = await prisma.part.create({
        data: {
            partNumber: 'TEST-SUB-B',
            name: 'Test Sub Assembly B',
            category: 'SUB_ASSEMBLY',
            status: 'active',
            costs: { create: { unitCost: 20.0 } },
            planning: { create: { leadTimeDays: 3, safetyStock: 0 } },
            inventory: {
                create: {
                    warehouse: { connect: { code: 'MAIN' } },
                    quantity: 5, // Stock: 5
                }
            }
        }
    });

    // 3. Finished Product A (Part record for stock)
    const partA = await prisma.part.create({
        data: {
            partNumber: 'TEST-PROD-A',
            name: 'Test Finished Product A',
            category: 'FINISHED_GOOD',
            status: 'active',
            costs: { create: { unitCost: 150.0 } },
            planning: { create: { leadTimeDays: 2, safetyStock: 10 } }, // SS: 10
            inventory: {
                create: {
                    warehouse: { connect: { code: 'MAIN' } },
                    quantity: 0, // Stock: 0
                }
            }
        }
    });

    // --- CREATE PRODUCTS (Sales & BOM Headers) ---
    // Convention: SKU matches PartNumber
    console.log('📦 Creating Products & BOMs...');

    // Product B (Sub Assembly as a Product, so it can have a BOM)
    const productB = await prisma.product.create({
        data: {
            sku: 'TEST-SUB-B',
            name: 'Test Sub Assembly B',
            status: 'active',
        }
    });

    // BOM for B: Needs 1 * C
    await prisma.bomHeader.create({
        data: {
            productId: productB.id,
            version: 'v1',
            effectiveDate: new Date(),
            bomLines: {
                create: [{
                    lineNumber: 10,
                    partId: rawC.id,
                    quantity: 1,
                }]
            }
        }
    });

    // Product A (End Item)
    const productA = await prisma.product.create({
        data: {
            sku: 'TEST-PROD-A',
            name: 'Test Finished Product A',
            status: 'active',
            basePrice: 200.0,
        }
    });

    // BOM for A: Needs 2 * B
    await prisma.bomHeader.create({
        data: {
            productId: productA.id,
            version: 'v1',
            effectiveDate: new Date(),
            bomLines: {
                create: [{
                    lineNumber: 10,
                    partId: subB.id,
                    quantity: 2,
                }]
            }
        }
    });

    // --- CREATE DEMAND (Sales Order) ---
    console.log('📝 Creating Sales Order...');

    await prisma.salesOrder.create({
        data: {
            orderNumber: 'SO-TEST-001',
            // customerName is missing in schema, check where customer info is.
            // SalesOrder usually links to Customer model.
            // Let's create a dummy customer.
            customer: {
                connectOrCreate: {
                    where: { code: 'CUST-001' },
                    create: { code: 'CUST-001', name: 'Test Customer' }
                }
            },
            status: 'confirmed', // Must be confirmed to trigger MRP
            orderDate: new Date(),
            requiredDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            lines: {
                create: {
                    productId: productA.id,
                    quantity: 10, // Demand: 10
                    lineNumber: 1,
                    unitPrice: 200,
                }
            }
        }
    });

    console.log('✅ Seeding Complete.');
    console.log('Expectation:');
    console.log('1. Gross Req A: 10. Net A: 20 (10 Order + 10 SS). -> Buy/Make 20.');
    console.log('2. Gross Req B: 40 (20*2). Stock 5. Net B: 35. -> Buy/Make 35.');
    console.log('3. Gross Req C: 35 (35*1). Stock 100. Net C: 0. -> No Action.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
