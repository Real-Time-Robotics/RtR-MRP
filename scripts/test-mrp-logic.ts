import { runMrpCalculation } from '../src/lib/mrp-engine';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Triggering MRP Logic...');

    const start = Date.now();

    // Call the function directly (bypassing Queue for logic verify)
    const result = await runMrpCalculation({
        planningHorizonDays: 90,
        includeConfirmed: true,
        includeDraft: false,
        includeSafetyStock: true,
    });

    const duration = Date.now() - start;
    console.log(`⏱ MRP Finished in ${duration}ms`);
    console.log(`Run ID: ${result.id}, Status: ${result.status}`);

    // Checks
    console.log('\n🔍 Verifying Suggestions...');

    const suggestions = await prisma.mrpSuggestion.findMany({
        where: { mrpRunId: result.id },
        include: { part: true }
    });

    // Group by Part to check Levels
    const suggestionsByPart = suggestions.reduce((acc, s) => {
        acc[s.part.partNumber] = (acc[s.part.partNumber] || 0) + s.suggestedQty!;
        return acc;
    }, {} as Record<string, number>);

    console.log('Suggestions Summary:', suggestionsByPart);

    // Expectations
    // A: Net 20.
    // B: Net 35.
    // C: Net 0. (Stock 100 covers demand 35) but verified demand should be checked in logs if possible, 
    // or checks for "Purchase" vs "None".

    // Actually, if C needs 0, we might not get a suggestion unless logic generates "cancel" or "none"?
    // Usually MRP only generates "Purchase" or "Expedite".
    // Let's check partRequirements internal logic if we could.
    // But strictly looking at suggestions:

    const qtyA = suggestionsByPart['TEST-PROD-A'] || 0;
    const qtyB = suggestionsByPart['TEST-SUB-B'] || 0;
    const qtyC = suggestionsByPart['TEST-RAW-C'] || 0;

    console.log(`\n📋 Validation Results:`);
    console.log(`[Level 0] Prod A: Expected ~20. Actual: ${qtyA}. ${qtyA === 20 ? '✅' : '❌'}`);
    console.log(`[Level 1] Sub B:  Expected ~35. Actual: ${qtyB}. ${qtyB === 35 ? '✅' : '❌'}`);
    console.log(`[Level 2] Raw C:  Expected 0.   Actual: ${qtyC}. ${qtyC === 0 ? '✅' : '❌'}`);

    // Check if C was even considered?
    // If B is missing, C will definitely be missing.

    if (qtyB === 0) {
        console.error('🚨 FAIL: Sub-Assembly B got NO suggestions. Multi-level logic is likely broken or implicit.');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
