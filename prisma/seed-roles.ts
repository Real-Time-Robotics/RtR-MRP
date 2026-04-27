// prisma/seed-roles.ts — Seed 6 default RBAC roles (idempotent)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROLES = [
  { code: 'engineer', name: 'Kỹ sư R&D', description: 'Thiết kế module, BOM, ECR' },
  { code: 'warehouse', name: 'Kho', description: 'Nhận hàng, xuất hàng, kiểm kho' },
  { code: 'production', name: 'Sản xuất', description: 'Gia công, lắp ráp, WO' },
  { code: 'procurement', name: 'Mua hàng', description: 'PR, PO, Supplier, MRP' },
  { code: 'admin', name: 'Quản trị', description: 'Toàn quyền' },
  { code: 'viewer', name: 'Xem', description: 'Chỉ đọc, không thao tác' },
] as const;

async function main() {
  console.log('Seeding roles...');

  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { code: role.code },
      create: {
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: true,
      },
      update: {
        name: role.name,
        description: role.description,
      },
    });
    console.log(`  ✓ ${role.code} — ${role.name}`);
  }

  const count = await prisma.role.count();
  console.log(`Done. ${count} roles in DB.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
