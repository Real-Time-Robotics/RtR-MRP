// scripts/assign-default-roles.ts — Assign default roles to existing users (idempotent)
// First user (by createdAt) = admin, rest = viewer

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Assigning default roles to existing users...');

  const adminRole = await prisma.role.findUnique({ where: { code: 'admin' } });
  const viewerRole = await prisma.role.findUnique({ where: { code: 'viewer' } });

  if (!adminRole || !viewerRole) {
    console.error('Roles not seeded. Run: npx tsx prisma/seed-roles.ts');
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, createdAt: true },
  });

  if (users.length === 0) {
    console.log('No users found.');
    return;
  }

  let adminCount = 0;
  let viewerCount = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const roleId = i === 0 ? adminRole.id : viewerRole.id;
    const roleCode = i === 0 ? 'admin' : 'viewer';

    try {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId } },
        create: { userId: user.id, roleId },
        update: {},
      });

      if (i === 0) {
        adminCount++;
        console.log(`  ✓ ${user.email} → admin (first user)`);
      } else {
        viewerCount++;
      }
    } catch (e) {
      console.error(`  ✗ ${user.email}: ${(e as Error).message}`);
    }
  }

  console.log(`Done. ${users.length} users assigned: ${adminCount} admin, ${viewerCount} viewer.`);
}

main()
  .catch((e) => {
    console.error('Assignment failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
