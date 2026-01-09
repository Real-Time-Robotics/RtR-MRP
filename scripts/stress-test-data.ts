
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuration
const COUNTS = {
    SUPPLIERS: 50,
    CUSTOMERS: 200,
    PARTS: 500,
    SALES_ORDERS: 500,
};

// --- Helpers ---

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(arr: T[]): T {
    return arr[randomInt(0, arr.length - 1)];
}

function randomStr(length: number) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const CATEGORIES = ['Components', 'Raw Materials', 'Finished Goods', 'Packaging', 'Electronics', 'Hardware'];
const UNITS = ['PCS', 'KG', 'M', 'L', 'BOX', 'SET'];
const LOCATIONS = ['Warehouse A', 'Warehouse B', 'Production Line 1', 'Testing Lab', 'Shipping Dock'];
const COUNTRIES = ['USA', 'Vietnam', 'Germany', 'Japan', 'China', 'Singapore'];

// --- Generators ---

async function seedSuppliers() {
    console.log(`Creating ${COUNTS.SUPPLIERS} Suppliers...`);
    const data = Array.from({ length: COUNTS.SUPPLIERS }).map((_, i) => ({
        code: `SUP-STRESS-${randomStr(4)}-${i}`,
        name: `Stress Test Supplier ${i + 1}`,
        country: randomPick(COUNTRIES),
        status: Math.random() > 0.1 ? 'active' : 'inactive',
        rating: randomInt(1, 5),
        leadTimeDays: randomInt(1, 60),
        ndaaCompliant: Math.random() > 0.2, // 80% compliant
        paymentTerms: randomPick(['NET30', 'NET60', 'IMMEDIATE']),
    }));

    // Create in chunks to avoid query limits if needed, but 50 is small
    await prisma.supplier.createMany({
        data,
        skipDuplicates: true,
    });
}

async function seedCustomers() {
    console.log(`Creating ${COUNTS.CUSTOMERS} Customers...`);
    const data = Array.from({ length: COUNTS.CUSTOMERS }).map((_, i) => ({
        code: `CUS-STRESS-${randomStr(4)}-${i}`,
        name: `Stress Test Customer ${i + 1}`,
        country: randomPick(COUNTRIES),
        type: randomPick(['Enterprise', 'SMB', 'Government', 'Distributor']),
        status: Math.random() > 0.1 ? 'active' : 'inactive',
        creditLimit: randomInt(1000, 100000),
        billingAddress: `123 Stress Test Blvd, Suite ${i}`,
    }));

    await prisma.customer.createMany({
        data,
        skipDuplicates: true,
    });
}

async function seedParts() {
    console.log(`Creating ${COUNTS.PARTS} Parts...`);

    // Note: Nested writes like 'planning' and 'cost' are not supported in createMany.
    // We have to loop for Parts if we want relations, or insert separately.
    // For speed, let's do parallel execution in batches.

    const batchSize = 50;

    for (let i = 0; i < COUNTS.PARTS; i += batchSize) {
        const batchPromises = Array.from({ length: Math.min(batchSize, COUNTS.PARTS - i) }).map(async (_, idx) => {
            const partNum = `PART-STRESS-${randomStr(5)}-${i + idx}`;

            try {
                await prisma.part.upsert({
                    where: { partNumber: partNum },
                    create: {
                        partNumber: partNum,
                        name: `Stress Test Part ${randomStr(3)}`,
                        category: randomPick(CATEGORIES),
                        unit: randomPick(UNITS),
                        status: Math.random() > 0.1 ? 'active' : 'obsolete',
                        isCritical: Math.random() < 0.1,
                        description: 'Generated during stress test',
                        planning: {
                            create: {
                                leadTimeDays: randomInt(1, 90),
                                minStockLevel: randomInt(0, 100),
                                reorderPoint: randomInt(10, 200),
                                maxStock: randomInt(500, 2000),
                                safetyStock: randomInt(5, 50),
                                makeOrBuy: randomPick(['MAKE', 'BUY']) as any,
                            }
                        },
                        costs: {
                            create: {
                                unitCost: randomInt(1, 500) + Math.random(),
                                standardCost: randomInt(1, 500) + Math.random(),
                            }
                        }
                    },
                    update: {} // Skip if exists
                });
            } catch (err) {
                // Ignore unique constraint errors mostly
            }
        });

        await Promise.all(batchPromises);
        process.stdout.write('.');
    }
    console.log('\nParts Done.');
}

async function seedSalesOrders() {
    console.log(`Creating ${COUNTS.SALES_ORDERS} Sales Orders...`);

    // Fetch customers to link
    const customers = await prisma.customer.findMany({ select: { id: true }, take: 100 });
    if (customers.length === 0) {
        console.log('Skipping Orders: No customers found');
        return;
    }

    const batchSize = 50;

    for (let i = 0; i < COUNTS.SALES_ORDERS; i += batchSize) {
        const batchPromises = Array.from({ length: Math.min(batchSize, COUNTS.SALES_ORDERS - i) }).map(async (_, idx) => {
            const orderNum = `SO-STRESS-${randomStr(4)}-${i + idx}`;
            const customer = randomPick(customers);

            try {
                await prisma.salesOrder.upsert({
                    where: { orderNumber: orderNum },
                    create: {
                        orderNumber: orderNum,
                        customerId: customer.id,
                        status: randomPick(['draft', 'confirmed', 'shipped', 'completed']),
                        priority: randomPick(['normal', 'high', 'urgent']),
                        orderDate: new Date(),
                        requiredDate: new Date(Date.now() + randomInt(1, 30) * 24 * 60 * 60 * 1000),
                        totalAmount: randomInt(100, 50000),
                        currency: 'USD'
                    },
                    update: {}
                });
            } catch (err) { }
        });

        await Promise.all(batchPromises);
        process.stdout.write('.');
    }
    console.log('\nSales Orders Done.');
}


async function main() {
    console.log('🚀 Starting Stress Test Data Seeding...');

    await seedSuppliers();
    await seedCustomers();
    await seedParts();
    await seedSalesOrders();

    console.log('✅ Stress Seed Completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
