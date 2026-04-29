// Sprint 28 TIP-S28-10 — Production Seed Data
// Run: npx tsx prisma/seed-production.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Sprint 28 production data...');

  // ===================== 1. Users (9 demo) =====================
  const users = [
    { email: 'quandoc@rtr.local', name: 'Nguyễn Văn Quản', role: 'production' },
    { email: 'supervisor1@rtr.local', name: 'Trần Thị Giám 1', role: 'production' },
    { email: 'supervisor2@rtr.local', name: 'Lê Văn Giám 2', role: 'production' },
    { email: 'operator1@rtr.local', name: 'Phạm Công Nhân 1', role: 'production' },
    { email: 'operator2@rtr.local', name: 'Hoàng Công Nhân 2', role: 'production' },
    { email: 'operator3@rtr.local', name: 'Đỗ Công Nhân 3', role: 'production' },
    { email: 'operator4@rtr.local', name: 'Vũ Công Nhân 4', role: 'production' },
    { email: 'operator5@rtr.local', name: 'Bùi Công Nhân 5', role: 'production' },
    { email: 'baotri@rtr.local', name: 'Ngô Bảo Trì', role: 'production' },
    { email: 'truongphong@rtr.local', name: 'Đinh Trưởng Phòng', role: 'production' },
  ];

  const createdUsers: Array<{ id: string; email: string; name: string }> = [];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name },
      create: {
        email: u.email,
        name: u.name,
        password: '$2b$10$dummy.hashed.password.for.seed.only',
        role: u.role,
        status: 'active',
      },
    });
    createdUsers.push({ id: user.id, email: user.email, name: user.name || '' });

    // Assign role via UserRole
    const roleRecord = await prisma.role.findFirst({ where: { code: u.role } });
    if (roleRecord) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: roleRecord.id } },
        update: {},
        create: { userId: user.id, roleId: roleRecord.id },
      });
    }
  }

  console.log(`  ✓ ${createdUsers.length} users seeded`);

  // ===================== 2. Work Centers (3) =====================
  const workCenters = [
    { code: 'SMT-01', name: 'SMT Line 1', type: 'MACHINE', capacityPerDay: 500 },
    { code: 'HAND-01', name: 'Hand Assembly', type: 'ASSEMBLY', capacityPerDay: 200 },
    { code: 'QC-01', name: 'Quality Control', type: 'TESTING', capacityPerDay: 300 },
  ];

  const createdWCs: Array<{ id: string; code: string }> = [];
  for (const wc of workCenters) {
    const created = await prisma.workCenter.upsert({
      where: { code: wc.code },
      update: { name: wc.name },
      create: { code: wc.code, name: wc.name, type: wc.type, capacityType: 'units', capacityPerDay: wc.capacityPerDay, status: 'active' },
    });
    createdWCs.push({ id: created.id, code: created.code });
  }
  console.log(`  ✓ ${createdWCs.length} work centers seeded`);

  // ===================== 3. Shifts (3) =====================
  const shifts = [
    { code: 'SANG', name: 'Ca Sáng', startTime: '06:00', endTime: '14:00', durationHours: 8 },
    { code: 'CHIEU', name: 'Ca Chiều', startTime: '14:00', endTime: '22:00', durationHours: 8 },
    { code: 'DEM', name: 'Ca Đêm', startTime: '22:00', endTime: '06:00', durationHours: 8 },
  ];

  const createdShifts: Array<{ id: string; code: string }> = [];
  for (const s of shifts) {
    const created = await prisma.shift.upsert({
      where: { code: s.code },
      update: { name: s.name },
      create: { code: s.code, name: s.name, startTime: s.startTime, endTime: s.endTime, durationHours: s.durationHours, isActive: true },
    });
    createdShifts.push({ id: created.id, code: created.code });
  }
  console.log(`  ✓ ${createdShifts.length} shifts seeded`);

  // ===================== 4. Equipment (5) =====================
  const equipment = [
    { code: 'SMT-OVEN-01', name: 'Reflow Oven #1', type: 'Oven', wcCode: 'SMT-01', status: 'operational' },
    { code: 'SMT-PICK-01', name: 'Pick & Place #1', type: 'Pick-Place', wcCode: 'SMT-01', status: 'operational' },
    { code: 'HAND-SOLDER-01', name: 'Soldering Station #1', type: 'Soldering', wcCode: 'HAND-01', status: 'operational' },
    { code: 'QC-SCOPE-01', name: 'AOI Microscope', type: 'Inspection', wcCode: 'QC-01', status: 'operational' },
    { code: 'SMT-PRINTER-01', name: 'Stencil Printer', type: 'Printer', wcCode: 'SMT-01', status: 'maintenance' },
  ];

  for (const eq of equipment) {
    const wc = createdWCs.find((w) => w.code === eq.wcCode);
    await prisma.equipment.upsert({
      where: { code: eq.code },
      update: { name: eq.name, status: eq.status },
      create: { code: eq.code, name: eq.name, type: eq.type, status: eq.status, ...(wc?.id ? { workCenterId: wc.id } : {}) },
    });
  }
  console.log(`  ✓ ${equipment.length} equipment seeded`);

  // ===================== 5. DataSource (1 demo) =====================
  const ds = await prisma.dataSource.upsert({
    where: { code: 'SX-PARTS-DEMO' },
    update: {},
    create: {
      code: 'SX-PARTS-DEMO',
      name: 'Bảng linh kiện phòng SX (demo)',
      type: 'EXCEL_UPLOAD',
      ownerDept: 'Sản xuất',
      status: 'active',
      createdByUserId: createdUsers[0]?.id,
    },
  });
  console.log(`  ✓ DataSource seeded: ${ds.code}`);

  console.log('\n✅ Sprint 28 seed complete!');
  console.log(`\nDemo accounts (password: not set, use admin to assign):`);
  for (const u of createdUsers) {
    console.log(`  ${u.email} — ${u.name}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
