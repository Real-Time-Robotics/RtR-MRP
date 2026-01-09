
import { generateSuppliers, generateParts, generateCustomers } from '../src/lib/stress-test-data';
import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('Starting stress test seeding...');

    try {
        console.log('Generating 500 Suppliers...');
        const suppliers = await generateSuppliers(500);
        console.log(`✅ Generated ${suppliers} suppliers`);

        console.log('Generating 500 Customers...');
        const customers = await generateCustomers(500);
        console.log(`✅ Generated ${customers} customers`);

        console.log('Generating 500 Parts...');
        const parts = await generateParts(500);
        console.log(`✅ Generated ${parts} parts`);

        console.log('Stress test seeding completed successfully.');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
