
import { prisma } from '../src/lib/prisma';

async function main() {
    const id = 'cmk0mfznq001t14i5x7ili36h';
    console.log(`Checking Inventory ID: ${id}`);
    const inv = await prisma.inventory.findUnique({
        where: { id }
    });
    console.log(inv ? 'Found: ' + JSON.stringify(inv) : 'NOT FOUND in DB');
}

main().catch(console.error);
