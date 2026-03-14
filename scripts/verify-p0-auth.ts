/**
 * P0 Auth Coverage Verification Script
 * Verifies all P0 API routes are protected by auth wrappers
 *
 * Usage: npx tsx scripts/verify-p0-auth.ts
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

const API_DIR = 'src/app/api';

const P0_ROUTES = [
  // TIP-P0-001: PO Approval Workflow
  'purchase-orders/[id]/submit',
  'purchase-orders/[id]/approve',
  'purchase-orders/[id]/reject',
  'purchase-orders/[id]/cancel',

  // TIP-P0-002: GRN
  'purchase-orders/grn',
  'purchase-orders/grn/[id]',

  // TIP-P0-003: 3-Way Matching
  'purchase-orders/matching',
  'purchase-orders/matching/queue',
  'purchase-orders/matching/[id]/review',
  'purchase-orders/matching/[id]/invoice',

  // TIP-P0-004: Quotation CRUD
  'quotations',
  'quotations/[id]',

  // TIP-P0-005: Pricing Rules
  'pricing-rules',
  'pricing-rules/[id]',
  'pricing-rules/calculate',

  // TIP-P0-006: Quote Conversion
  'quotations/[id]/accept',
  'quotations/[id]/convert',
  'quotations/[id]/reject',

  // TIP-P0-008: Customer Credit + Contacts
  'customers/[id]/credit',
  'customers/[id]/credit/check',
  'customers/[id]/contacts',
  'customers/[id]/contacts/[contactId]',

  // TIP-P0-009: Customer 360
  'customers/[id]/360',

  // TIP-P0-010: Supplier Scoring
  'suppliers/[id]/scores',
  'suppliers/[id]/scores/calculate',
  'suppliers/ranking',
  'suppliers/[id]/audits',
  'suppliers/[id]/audits/[auditId]',
];

async function verifyAuthCoverage() {
  let protectedCount = 0;
  let notFound = 0;
  const unprotected: string[] = [];
  const missing: string[] = [];

  for (const route of P0_ROUTES) {
    const routePath = join(API_DIR, route, 'route.ts');
    try {
      const content = await readFile(routePath, 'utf-8');

      const hasAuth =
        content.includes('withPermission') ||
        content.includes('withRoleAuth') ||
        content.includes('withAuth');

      if (hasAuth) {
        protectedCount++;
        console.log(`  ✅ ${route}`);
      } else {
        unprotected.push(route);
        console.log(`  ❌ ${route} — NO AUTH WRAPPER`);
      }
    } catch {
      notFound++;
      missing.push(route);
      console.log(`  ⚠️  ${route} — FILE NOT FOUND`);
    }
  }

  const total = P0_ROUTES.length;
  const coverage = ((protectedCount / (total - notFound)) * 100).toFixed(1);

  console.log('\n' + '='.repeat(50));
  console.log('📊 P0 Auth Coverage Report');
  console.log('='.repeat(50));
  console.log(`Total P0 routes:    ${total}`);
  console.log(`Protected:          ${protectedCount}`);
  console.log(`Unprotected:        ${unprotected.length}`);
  console.log(`Not found:          ${notFound}`);
  console.log(`Coverage:           ${coverage}%`);

  if (unprotected.length > 0) {
    console.log('\n❌ Unprotected routes:');
    unprotected.forEach((r) => console.log(`   - ${r}`));
  }

  if (missing.length > 0) {
    console.log('\n⚠️  Missing routes:');
    missing.forEach((r) => console.log(`   - ${r}`));
  }

  if (unprotected.length === 0 && notFound === 0) {
    console.log('\n✅ All P0 routes are protected!');
  }

  // Exit with error if any unprotected
  process.exit(unprotected.length > 0 ? 1 : 0);
}

verifyAuthCoverage().catch(console.error);
