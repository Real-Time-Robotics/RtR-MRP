// prisma/seed-demo-production.ts — Seed realistic demo production data
// Usage: npx tsx prisma/seed-demo-production.ts [--dry-run] [--reset]

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const isDryRun = process.argv.includes('--dry-run');
const isReset = process.argv.includes('--reset');

async function main() {
  console.log(`Seed demo production data (dry-run=${isDryRun}, reset=${isReset})`);

  if (isReset) {
    console.log('Resetting demo data...');
    if (!isDryRun) {
      await prisma.dailyProductionPlanLine.deleteMany({ where: { plan: { planNumber: { startsWith: 'DPP-DEMO' } } } });
      await prisma.dailyProductionPlan.deleteMany({ where: { planNumber: { startsWith: 'DPP-DEMO' } } });
      await prisma.workOrder.deleteMany({ where: { woNumber: { startsWith: 'WO-DEMO' } } });
      await prisma.equipment.deleteMany({ where: { code: { startsWith: 'EQ-' } } });
      await prisma.workCenter.deleteMany({ where: { code: { startsWith: 'WC-' } } });
      await prisma.shift.deleteMany({ where: { code: { startsWith: 'SHIFT-' } } });
      console.log('Reset done.');
    }
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Work Centers
  const workCenters = [
    { code: 'WC-SMT', name: 'SMT Line', type: 'MACHINE', capacityPerHour: 60 },
    { code: 'WC-ASM', name: 'Hand Assembly', type: 'ASSEMBLY', capacityPerHour: 30 },
    { code: 'WC-QC', name: 'Testing & QC', type: 'TESTING', capacityPerHour: 20 },
  ];

  for (const wc of workCenters) {
    const existing = await prisma.workCenter.findFirst({ where: { code: wc.code } });
    if (!existing && !isDryRun) {
      await prisma.workCenter.create({
        data: { code: wc.code, name: wc.name, type: wc.type, capacityPerHour: wc.capacityPerHour, status: 'active' },
      });
      console.log(`  Created WorkCenter: ${wc.code}`);
    } else {
      console.log(`  ${existing ? 'Exists' : 'Would create'}: WorkCenter ${wc.code}`);
    }
  }

  // 2. Shifts
  const shifts = [
    { code: 'SHIFT-S', name: 'Ca Sáng', startTime: '06:00', endTime: '14:00' },
    { code: 'SHIFT-C', name: 'Ca Chiều', startTime: '14:00', endTime: '22:00' },
    { code: 'SHIFT-D', name: 'Ca Đêm', startTime: '22:00', endTime: '06:00' },
  ];

  for (const s of shifts) {
    const existing = await prisma.shift.findFirst({ where: { code: s.code } });
    if (!existing && !isDryRun) {
      await prisma.shift.create({
        data: { code: s.code, name: s.name, startTime: s.startTime, endTime: s.endTime, isActive: true },
      });
      console.log(`  Created Shift: ${s.code}`);
    } else {
      console.log(`  ${existing ? 'Exists' : 'Would create'}: Shift ${s.code}`);
    }
  }

  // 3. Equipment
  const wcSmt = await prisma.workCenter.findFirst({ where: { code: 'WC-SMT' } });
  const wcAsm = await prisma.workCenter.findFirst({ where: { code: 'WC-ASM' } });
  const wcQc = await prisma.workCenter.findFirst({ where: { code: 'WC-QC' } });

  if (wcSmt && wcQc && wcAsm) {
    const equipment = [
      { code: 'EQ-SMT-01', name: 'SMT Pick & Place', type: 'CNC', workCenterId: wcSmt.id, status: 'operational' },
      { code: 'EQ-SMT-02', name: 'Reflow Oven', type: 'MACHINE', workCenterId: wcSmt.id, status: 'operational' },
      { code: 'EQ-ASM-01', name: 'Hand Assembly Bench', type: 'ASSEMBLY', workCenterId: wcAsm.id, status: 'idle' },
      { code: 'EQ-QC-01', name: 'ICT Tester', type: 'TESTING', workCenterId: wcQc.id, status: 'operational' },
      { code: 'EQ-QC-02', name: 'AOI Camera', type: 'TESTING', workCenterId: wcQc.id, status: 'maintenance' },
    ];

    for (const eq of equipment) {
      const existing = await prisma.equipment.findFirst({ where: { code: eq.code } });
      if (!existing && !isDryRun) {
        await prisma.equipment.create({ data: eq });
        console.log(`  Created Equipment: ${eq.code}`);
      } else {
        console.log(`  ${existing ? 'Exists' : 'Would create'}: Equipment ${eq.code}`);
      }
    }
  }

  // 4. Products (need at least 1 for WO)
  let product = await prisma.product.findFirst({ where: { sku: 'DEMO-HERA-IO1' } });
  if (!product && !isDryRun) {
    product = await prisma.product.create({
      data: { sku: 'DEMO-HERA-IO1', name: 'Hera IO1 v1.5 EBOX', status: 'active' },
    });
    console.log('  Created Product: DEMO-HERA-IO1');
  }

  // 5. Work Orders
  if (product) {
    const wos = [
      { woNumber: 'WO-DEMO-001', quantity: 10, status: 'draft', completedQty: 0, dueDate: new Date(today.getTime() + 3 * 86400000) },
      { woNumber: 'WO-DEMO-002', quantity: 20, status: 'IN_PROGRESS', completedQty: 8, dueDate: new Date(today.getTime() + 5 * 86400000) },
      { woNumber: 'WO-DEMO-003', quantity: 15, status: 'COMPLETED', completedQty: 15, scrapQty: 1, dueDate: new Date(today.getTime() - 86400000) },
      { woNumber: 'WO-DEMO-004', quantity: 5, status: 'draft', completedQty: 0, dueDate: new Date(today.getTime() + 7 * 86400000) },
      { woNumber: 'WO-DEMO-005', quantity: 50, status: 'draft', completedQty: 0, dueDate: new Date(today.getTime() - 2 * 86400000) },
    ];

    for (const wo of wos) {
      const existing = await prisma.workOrder.findFirst({ where: { woNumber: wo.woNumber } });
      if (!existing && !isDryRun) {
        await prisma.workOrder.create({
          data: { ...wo, productId: product.id },
        });
        console.log(`  Created WO: ${wo.woNumber} (${wo.status})`);
      } else {
        console.log(`  ${existing ? 'Exists' : 'Would create'}: WO ${wo.woNumber}`);
      }
    }

    // 6. Daily Production Plan (today)
    if (wcSmt) {
      const existingPlan = await prisma.dailyProductionPlan.findFirst({
        where: { planNumber: 'DPP-DEMO-001' },
      });
      if (!existingPlan && !isDryRun) {
        const wo2 = await prisma.workOrder.findFirst({ where: { woNumber: 'WO-DEMO-002' } });
        const wo1 = await prisma.workOrder.findFirst({ where: { woNumber: 'WO-DEMO-001' } });
        if (wo2 && wo1) {
          await prisma.dailyProductionPlan.create({
            data: {
              planNumber: 'DPP-DEMO-001',
              date: today,
              workCenterId: wcSmt.id,
              status: 'APPROVED',
              lines: {
                create: [
                  { workOrderId: wo2.id, sequence: 1, plannedQty: 12, estimatedStartTime: '08:00', estimatedEndTime: '12:00' },
                  { workOrderId: wo1.id, sequence: 2, plannedQty: 10, estimatedStartTime: '13:00', estimatedEndTime: '17:00' },
                ],
              },
            },
          });
          console.log('  Created DailyProductionPlan: DPP-DEMO-001 (today, APPROVED)');
        }
      } else {
        console.log(`  ${existingPlan ? 'Exists' : 'Would create'}: Plan DPP-DEMO-001`);
      }
    }
  }

  console.log('\nSeed demo production complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
