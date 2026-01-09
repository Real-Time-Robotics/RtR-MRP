
import { prisma } from '../src/lib/prisma';

async function main() {
    const item = await prisma.inventory.findFirst();
    if (item) {
        console.log(`VALID ID: ${item.id}`);
    } else {
        console.log('NO INVENTORY ITEMS FOUND');
    }
}

main().catch(console.error);
