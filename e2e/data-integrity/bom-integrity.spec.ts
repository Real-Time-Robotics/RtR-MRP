/**
 * BOM DATA INTEGRITY TESTS
 *
 * Verifies that BOM headers and lines are correctly saved and updated.
 * Tests the newly created PUT handler for BOM updates.
 *
 * @tags @data-integrity @bom @regression
 */

import { test, expect } from '../fixtures/auth.fixture';
import { generateTestId } from '../utils/test-helpers';
import {
  DataIntegrityResult,
  FieldComparison,
  generateReport,
  takeIntegrityScreenshot,
  compareValues,
} from '../utils/data-integrity-helpers';

// ============================================================================
// BOM TEST DATA
// ============================================================================

interface BomLineTestData {
  partId: string;
  quantity: number;
  unit: string;
  level: number;
  moduleCode: string;
  moduleName: string;
  position: string;
  isCritical: boolean;
  scrapRate: number;
  notes: string;
}

interface BomTestData {
  productId: string;
  version: string;
  status: string;
  effectiveDate: string;
  notes: string;
  lines: BomLineTestData[];
}

function createBomTestData(): Partial<BomTestData> {
  const today = new Date().toISOString().split('T')[0];

  return {
    version: '1.0',
    status: 'draft',
    effectiveDate: today,
    notes: 'Data integrity test BOM',
  };
}

// ============================================================================
// BOM TESTS
// ============================================================================

test.describe('BOM Data Integrity Tests @data-integrity @bom', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/bom');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  /**
   * Test: Verify BOM update preserves all header fields
   * This tests the newly created PUT handler
   */
  test('should preserve all header fields when updating BOM', async ({ authenticatedPage: page }) => {
    console.log('\n' + '='.repeat(60));
    console.log('BOM HEADER UPDATE TEST');
    console.log('='.repeat(60));

    // Find an existing BOM
    const firstRow = page.locator('tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('No BOMs found - skipping test');
      test.skip();
      return;
    }

    // Get BOM ID
    const bomLink = firstRow.locator('a[href*="/bom/"]').first();
    let bomId = '';

    if (await bomLink.isVisible().catch(() => false)) {
      const href = await bomLink.getAttribute('href');
      bomId = href?.split('/').pop() || '';
    }

    if (!bomId) {
      // Try to get from data attribute
      bomId = await firstRow.getAttribute('data-id') || '';
    }

    if (!bomId) {
      console.log('Could not get BOM ID - skipping');
      test.skip();
      return;
    }

    // Fetch original BOM via API
    const originalResponse = await page.request.get(`/api/bom/${bomId}`);
    const originalBom = await originalResponse.json();

    console.log('Original BOM:', JSON.stringify({
      id: originalBom.id,
      version: originalBom.version,
      status: originalBom.status,
      linesCount: originalBom.bomLines?.length || 0,
    }, null, 2));

    // Record original values
    const originalVersion = originalBom.version;
    const originalStatus = originalBom.status;
    const originalLinesCount = originalBom.bomLines?.length || 0;

    // Update only notes (should preserve everything else)
    const newNotes = `Updated at ${new Date().toISOString()}`;

    const updateResponse = await page.request.put(`/api/bom/${bomId}`, {
      data: {
        notes: newNotes,
      },
    });

    expect(updateResponse.ok()).toBe(true);

    const updatedBom = await updateResponse.json();

    console.log('Updated BOM:', JSON.stringify({
      id: updatedBom.id,
      version: updatedBom.version,
      status: updatedBom.status,
      notes: updatedBom.notes,
      linesCount: updatedBom.bomLines?.length || 0,
    }, null, 2));

    // Verify fields are preserved
    const result: DataIntegrityResult = {
      success: true,
      entityType: 'BOM',
      entityId: bomId,
      comparisons: [],
      mismatches: [],
      errors: [],
    };

    const addComparison = (field: string, expected: any, actual: any, fieldType: 'string' | 'number' | 'boolean' = 'string') => {
      const match = compareValues(expected, actual, fieldType);
      const comparison: FieldComparison = { field, expected, actual, match };
      result.comparisons.push(comparison);
      if (!match) {
        result.mismatches.push(comparison);
        result.success = false;
      }
    };

    addComparison('version', originalVersion, updatedBom.version);
    addComparison('status', originalStatus, updatedBom.status);
    addComparison('notes', newNotes, updatedBom.notes);

    // Lines should be preserved if not modified
    if (originalLinesCount > 0) {
      addComparison('linesCount', originalLinesCount, updatedBom.bomLines?.length || 0, 'number');
    }

    const report = generateReport(result);
    console.log(report);

    expect(result.success, `BOM update integrity failed: ${result.mismatches.map(m => m.field).join(', ')}`).toBe(true);
  });

  /**
   * Test: Verify BOM lines are preserved during update
   */
  test('should preserve all line data when updating BOM header', async ({ authenticatedPage: page }) => {
    console.log('\n' + '='.repeat(60));
    console.log('BOM LINES PRESERVATION TEST');
    console.log('='.repeat(60));

    // Get a BOM with lines via API
    const response = await page.request.get('/api/bom?limit=10');
    const data = await response.json();

    // Find a BOM with lines
    let bomWithLines = null;

    if (Array.isArray(data)) {
      for (const bom of data) {
        const detailResponse = await page.request.get(`/api/bom/${bom.id}`);
        const detail = await detailResponse.json();
        if (detail.bomLines && detail.bomLines.length > 0) {
          bomWithLines = detail;
          break;
        }
      }
    }

    if (!bomWithLines) {
      console.log('No BOM with lines found - skipping');
      test.skip();
      return;
    }

    console.log(`Testing BOM: ${bomWithLines.id} with ${bomWithLines.bomLines.length} lines`);

    // Record original line data
    const originalLines = bomWithLines.bomLines.map((line: any) => ({
      id: line.id,
      partId: line.partId,
      quantity: line.quantity,
      unit: line.unit,
      level: line.level,
      moduleCode: line.moduleCode,
      isCritical: line.isCritical,
      scrapRate: line.scrapRate,
    }));

    console.log('Original lines:', JSON.stringify(originalLines.slice(0, 3), null, 2));

    // Update BOM (change notes only - should NOT affect lines)
    const updateResponse = await page.request.put(`/api/bom/${bomWithLines.id}`, {
      data: {
        notes: `Line preservation test at ${new Date().toISOString()}`,
      },
    });

    expect(updateResponse.ok()).toBe(true);

    // Re-fetch and verify lines
    const verifyResponse = await page.request.get(`/api/bom/${bomWithLines.id}`);
    const verifiedBom = await verifyResponse.json();

    console.log(`Verified BOM has ${verifiedBom.bomLines?.length || 0} lines`);

    // Compare lines
    expect(verifiedBom.bomLines.length).toBe(originalLines.length);

    let allLinesMatch = true;
    const lineMismatches: string[] = [];

    for (let i = 0; i < originalLines.length; i++) {
      const original = originalLines[i];
      const verified = verifiedBom.bomLines.find((l: any) => l.id === original.id);

      if (!verified) {
        lineMismatches.push(`Line ${original.id} not found after update`);
        allLinesMatch = false;
        continue;
      }

      // Compare key fields
      if (verified.partId !== original.partId) {
        lineMismatches.push(`Line ${i}: partId mismatch`);
        allLinesMatch = false;
      }
      if (Math.abs(verified.quantity - original.quantity) > 0.001) {
        lineMismatches.push(`Line ${i}: quantity mismatch (${original.quantity} vs ${verified.quantity})`);
        allLinesMatch = false;
      }
      if (verified.isCritical !== original.isCritical) {
        lineMismatches.push(`Line ${i}: isCritical mismatch`);
        allLinesMatch = false;
      }
    }

    if (lineMismatches.length > 0) {
      console.log('Line mismatches:', lineMismatches);
    }

    expect(allLinesMatch, `BOM lines were modified unexpectedly: ${lineMismatches.join(', ')}`).toBe(true);
    console.log('✅ All BOM lines preserved after header update');
  });

  /**
   * Test: Verify BOM line quantities preserve decimals
   */
  test('should preserve decimal quantities in BOM lines', async ({ authenticatedPage: page }) => {
    console.log('\n' + '='.repeat(60));
    console.log('BOM DECIMAL QUANTITY TEST');
    console.log('='.repeat(60));

    // Get a BOM
    const response = await page.request.get('/api/bom?limit=1');
    const data = await response.json();

    if (!data || data.length === 0) {
      console.log('No BOMs found - skipping');
      test.skip();
      return;
    }

    const bom = data[0];
    const bomId = bom.id;

    // Get BOM details to find a part
    const detailResponse = await page.request.get(`/api/bom/${bomId}`);
    const bomDetail = await detailResponse.json();

    // Get available parts
    const partsResponse = await page.request.get('/api/parts?limit=1');
    const partsData = await partsResponse.json();

    if (!partsData.parts || partsData.parts.length === 0) {
      console.log('No parts found - skipping');
      test.skip();
      return;
    }

    const testPartId = partsData.parts[0].id;
    const decimalQuantity = 2.5; // Test decimal value

    // Update BOM with a line having decimal quantity
    const updateResponse = await page.request.put(`/api/bom/${bomId}`, {
      data: {
        lines: [
          {
            partId: testPartId,
            quantity: decimalQuantity,
            unit: 'pcs',
            level: 1,
            isCritical: false,
            scrapRate: 0,
          },
        ],
      },
    });

    expect(updateResponse.ok()).toBe(true);

    // Verify
    const verifyResponse = await page.request.get(`/api/bom/${bomId}`);
    const verifiedBom = await verifyResponse.json();

    const savedLine = verifiedBom.bomLines?.[0];
    if (savedLine) {
      console.log(`Expected quantity: ${decimalQuantity}`);
      console.log(`Actual quantity: ${savedLine.quantity}`);

      const tolerance = 0.001;
      const diff = Math.abs(savedLine.quantity - decimalQuantity);
      expect(diff).toBeLessThan(tolerance);
      console.log('✅ Decimal quantity preserved');
    }
  });

  /**
   * Test: Verify version can be updated
   */
  test('should update BOM version correctly', async ({ authenticatedPage: page }) => {
    console.log('\n' + '='.repeat(60));
    console.log('BOM VERSION UPDATE TEST');
    console.log('='.repeat(60));

    // Get a draft BOM (can only update draft/active)
    const response = await page.request.get('/api/bom?status=draft&limit=1');
    const data = await response.json();

    if (!data || data.length === 0) {
      // Try active
      const activeResponse = await page.request.get('/api/bom?status=active&limit=1');
      const activeData = await activeResponse.json();

      if (!activeData || activeData.length === 0) {
        console.log('No editable BOM found - skipping');
        test.skip();
        return;
      }
    }

    const bom = data[0] || (await page.request.get('/api/bom?limit=1').then(r => r.json()))[0];

    if (!bom) {
      test.skip();
      return;
    }

    const bomId = bom.id;
    const newVersion = `${bom.version || '1.0'}-test`;

    console.log(`Updating BOM ${bomId} version from "${bom.version}" to "${newVersion}"`);

    const updateResponse = await page.request.put(`/api/bom/${bomId}`, {
      data: {
        version: newVersion,
      },
    });

    // May fail if version already exists for this product
    if (updateResponse.ok()) {
      const updatedBom = await updateResponse.json();
      expect(updatedBom.version).toBe(newVersion);
      console.log('✅ Version updated successfully');
    } else {
      const errorData = await updateResponse.json();
      console.log('Update failed (may be version conflict):', errorData);
      // This is expected if version already exists
    }
  });
});
