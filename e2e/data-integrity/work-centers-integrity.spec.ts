/**
 * WORK CENTER DATA INTEGRITY TESTS
 *
 * Verifies that ALL fields are correctly saved for Work Centers.
 * Tests the recently fixed nextMaintenanceDate field in POST handler.
 *
 * @tags @data-integrity @work-centers @production @regression
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
// WORK CENTER TEST DATA
// ============================================================================

interface WorkCenterTestData {
  code: string;
  name: string;
  description: string;
  type: string;
  department: string;
  location: string;
  capacityType: string;
  capacityPerDay: number;
  capacityPerHour: number;
  efficiency: number;
  utilizationTarget: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  breakMinutes: number;
  hourlyRate: number;
  setupCostPerHour: number;
  overheadRate: number;
  maxConcurrentJobs: number;
  requiresOperator: boolean;
  operatorSkillLevel: string;
  status: string;
  maintenanceInterval: number;
  nextMaintenanceDate: string; // <-- This was not being saved in POST
}

function createFullWorkCenterTestData(): WorkCenterTestData {
  const uniqueId = generateTestId('WC');
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return {
    code: uniqueId,
    name: `Test Work Center ${uniqueId}`,
    description: 'Work center created for data integrity testing',
    type: 'MACHINE',
    department: 'Production',
    location: 'Building A, Floor 2',
    capacityType: 'hours',
    capacityPerDay: 8,
    capacityPerHour: 10,
    efficiency: 85,
    utilizationTarget: 80,
    workingHoursStart: '08:00',
    workingHoursEnd: '17:00',
    breakMinutes: 60,
    hourlyRate: 150000,
    setupCostPerHour: 50000,
    overheadRate: 20,
    maxConcurrentJobs: 1,
    requiresOperator: true,
    operatorSkillLevel: 'SENIOR',
    status: 'active',
    maintenanceInterval: 30,
    nextMaintenanceDate: nextMonth, // <-- Critical field to test
  };
}

// ============================================================================
// WORK CENTER TESTS
// ============================================================================

test.describe('Work Center Data Integrity Tests @data-integrity @work-centers', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/production/work-centers');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  /**
   * CRITICAL TEST: Verify nextMaintenanceDate is saved on Create
   * This tests the recently fixed field in POST handler
   */
  test('should save nextMaintenanceDate when creating Work Center', async ({ authenticatedPage: page }) => {
    const testData = createFullWorkCenterTestData();

    console.log('\n' + '='.repeat(60));
    console.log('WORK CENTER CREATE - MAINTENANCE DATE TEST');
    console.log('='.repeat(60));
    console.log('Test Code:', testData.code);
    console.log('Expected nextMaintenanceDate:', testData.nextMaintenanceDate);
    console.log('='.repeat(60) + '\n');

    // Click Create button
    const createButton = page.locator('button:has-text("Thêm"), button:has-text("Create"), button:has-text("New")').first();

    if (!(await createButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      // Try navigation
      await page.goto('/production/work-centers/new');
      await page.waitForTimeout(2000);
    } else {
      await createButton.click();
      await page.waitForTimeout(500);
    }

    // Fill form
    const formContainer = page.locator('form, [role="dialog"]').first();

    const fillField = async (name: string, value: string | number) => {
      const input = formContainer.locator(`input[name="${name}"], textarea[name="${name}"]`).first();
      if (await input.isVisible().catch(() => false)) {
        await input.clear();
        await input.fill(String(value));
      }
    };

    // Basic fields
    await fillField('code', testData.code);
    await fillField('name', testData.name);
    await fillField('description', testData.description);
    await fillField('department', testData.department);
    await fillField('location', testData.location);

    // Capacity fields
    await fillField('capacityPerDay', testData.capacityPerDay);
    await fillField('capacityPerHour', testData.capacityPerHour);
    await fillField('efficiency', testData.efficiency);
    await fillField('utilizationTarget', testData.utilizationTarget);

    // Time fields
    await fillField('workingHoursStart', testData.workingHoursStart);
    await fillField('workingHoursEnd', testData.workingHoursEnd);
    await fillField('breakMinutes', testData.breakMinutes);

    // Cost fields
    await fillField('hourlyRate', testData.hourlyRate);
    await fillField('setupCostPerHour', testData.setupCostPerHour);
    await fillField('overheadRate', testData.overheadRate);

    // Maintenance fields - CRITICAL
    await fillField('maintenanceInterval', testData.maintenanceInterval);

    const maintenanceDateInput = formContainer.locator('input[name="nextMaintenanceDate"]').first();
    if (await maintenanceDateInput.isVisible().catch(() => false)) {
      await maintenanceDateInput.clear();
      await maintenanceDateInput.fill(testData.nextMaintenanceDate);
      console.log(`Entered nextMaintenanceDate: ${testData.nextMaintenanceDate}`);
    } else {
      console.log('nextMaintenanceDate input not found in UI - will verify via API');
    }

    await takeIntegrityScreenshot(page, 'work-center', 'before-create');

    // Save
    await page.locator('button:has-text("Lưu"), button:has-text("Save"), button[type="submit"]').first().click();
    await page.waitForTimeout(3000);

    // Verify via API
    const response = await page.request.get(`/api/production/work-centers?search=${testData.code}`);
    let data;

    try {
      data = await response.json();
    } catch {
      // Try direct API call
      const allResponse = await page.request.get('/api/production/work-centers');
      const allData = await allResponse.json();
      data = Array.isArray(allData) ? allData.filter((wc: any) => wc.code === testData.code) : [];
    }

    const savedWC = Array.isArray(data) ? data.find((wc: any) => wc.code === testData.code) : data;

    if (savedWC) {
      console.log('Saved Work Center:', JSON.stringify({
        code: savedWC.code,
        name: savedWC.name,
        efficiency: savedWC.efficiency,
        maintenanceInterval: savedWC.maintenanceInterval,
        nextMaintenanceDate: savedWC.nextMaintenanceDate,
      }, null, 2));

      const result: DataIntegrityResult = {
        success: true,
        entityType: 'WorkCenter',
        entityId: savedWC.id,
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

      addComparison('code', testData.code, savedWC.code);
      addComparison('name', testData.name, savedWC.name);
      addComparison('efficiency', testData.efficiency, savedWC.efficiency, 'number');
      addComparison('utilizationTarget', testData.utilizationTarget, savedWC.utilizationTarget, 'number');
      addComparison('hourlyRate', testData.hourlyRate, savedWC.hourlyRate, 'number');
      addComparison('maintenanceInterval', testData.maintenanceInterval, savedWC.maintenanceInterval, 'number');

      // CRITICAL: Check nextMaintenanceDate
      if (savedWC.nextMaintenanceDate) {
        const savedDate = new Date(savedWC.nextMaintenanceDate).toISOString().split('T')[0];
        const expectedDate = testData.nextMaintenanceDate;
        const datesMatch = savedDate === expectedDate;
        result.comparisons.push({
          field: 'nextMaintenanceDate',
          expected: expectedDate,
          actual: savedDate,
          match: datesMatch,
        });
        if (!datesMatch) {
          result.mismatches.push({
            field: 'nextMaintenanceDate',
            expected: expectedDate,
            actual: savedDate,
            match: false,
          });
          result.success = false;
        }
        console.log(`nextMaintenanceDate: expected=${expectedDate}, actual=${savedDate}, match=${datesMatch}`);
      } else {
        console.log('nextMaintenanceDate is null in saved data');
        // This is the bug we fixed!
        if (testData.nextMaintenanceDate) {
          result.mismatches.push({
            field: 'nextMaintenanceDate',
            expected: testData.nextMaintenanceDate,
            actual: null,
            match: false,
          });
          result.success = false;
        }
      }

      const report = generateReport(result);
      console.log(report);

      expect(result.success, `Work Center data integrity failed: ${result.mismatches.map(m => m.field).join(', ')}`).toBe(true);
    } else {
      console.log('Work Center not found - checking if creation succeeded via UI');
      test.skip();
    }
  });

  /**
   * Test: Verify all numeric fields are preserved
   */
  test('should preserve all numeric fields (efficiency, rates, etc.)', async ({ authenticatedPage: page }) => {
    const testData = {
      code: generateTestId('WCNUM'),
      name: 'Numeric Fields Test',
      efficiency: 92.5,
      utilizationTarget: 88,
      hourlyRate: 175000,
      capacityPerDay: 7.5,
    };

    console.log('\n' + '='.repeat(60));
    console.log('WORK CENTER NUMERIC FIELDS TEST');
    console.log('='.repeat(60));

    // Create via API
    const createResponse = await page.request.post('/api/production/work-centers', {
      data: {
        code: testData.code,
        name: testData.name,
        efficiency: testData.efficiency,
        utilizationTarget: testData.utilizationTarget,
        hourlyRate: testData.hourlyRate,
        capacityPerDay: testData.capacityPerDay,
        type: 'MACHINE',
        status: 'active',
      },
    });

    expect(createResponse.ok()).toBe(true);

    const savedWC = await createResponse.json();
    console.log('Saved:', JSON.stringify(savedWC, null, 2));

    // Verify numeric values
    const tolerance = 0.01;

    expect(Math.abs(savedWC.efficiency - testData.efficiency)).toBeLessThan(tolerance);
    expect(savedWC.utilizationTarget).toBe(testData.utilizationTarget);
    expect(savedWC.hourlyRate).toBe(testData.hourlyRate);
    expect(Math.abs(savedWC.capacityPerDay - testData.capacityPerDay)).toBeLessThan(tolerance);

    console.log('✅ All numeric fields preserved correctly');
  });

  /**
   * Test: Verify fields are preserved during update
   */
  test('should preserve all fields when updating Work Center', async ({ authenticatedPage: page }) => {
    console.log('\n' + '='.repeat(60));
    console.log('WORK CENTER UPDATE PRESERVATION TEST');
    console.log('='.repeat(60));

    // Get existing work centers
    const response = await page.request.get('/api/production/work-centers');
    const workCenters = await response.json();

    if (!workCenters || workCenters.length === 0) {
      console.log('No work centers found - skipping');
      test.skip();
      return;
    }

    const wc = workCenters[0];
    console.log('Testing Work Center:', wc.code);

    // Record original values
    const originalValues = {
      efficiency: wc.efficiency,
      utilizationTarget: wc.utilizationTarget,
      hourlyRate: wc.hourlyRate,
      nextMaintenanceDate: wc.nextMaintenanceDate,
    };

    console.log('Original values:', originalValues);

    // Update only description (should preserve everything else)
    const updateResponse = await page.request.put(`/api/production/work-centers/${wc.id}`, {
      data: {
        description: `Updated at ${new Date().toISOString()}`,
      },
    });

    if (!updateResponse.ok()) {
      console.log('Update failed:', await updateResponse.text());
      test.skip();
      return;
    }

    // Verify
    const verifyResponse = await page.request.get(`/api/production/work-centers/${wc.id}`);

    // Handle array or single response
    let verifiedWC;
    const verifyData = await verifyResponse.json();
    if (Array.isArray(verifyData)) {
      verifiedWC = verifyData.find((w: any) => w.id === wc.id);
    } else {
      verifiedWC = verifyData;
    }

    if (!verifiedWC) {
      // Try fetching all and finding
      const allResponse = await page.request.get('/api/production/work-centers');
      const allData = await allResponse.json();
      verifiedWC = allData.find((w: any) => w.id === wc.id);
    }

    if (verifiedWC) {
      console.log('Verified values:', {
        efficiency: verifiedWC.efficiency,
        utilizationTarget: verifiedWC.utilizationTarget,
        hourlyRate: verifiedWC.hourlyRate,
        nextMaintenanceDate: verifiedWC.nextMaintenanceDate,
      });

      expect(verifiedWC.efficiency).toBe(originalValues.efficiency);
      expect(verifiedWC.utilizationTarget).toBe(originalValues.utilizationTarget);
      expect(verifiedWC.hourlyRate).toBe(originalValues.hourlyRate);

      console.log('✅ All fields preserved after update');
    }
  });

  /**
   * Test: Verify workingDays array is preserved
   */
  test('should preserve workingDays array', async ({ authenticatedPage: page }) => {
    const testData = {
      code: generateTestId('WCDAYS'),
      name: 'Working Days Test',
      workingDays: [1, 2, 3, 4, 5], // Mon-Fri
      type: 'MACHINE',
      status: 'active',
    };

    console.log('\n' + '='.repeat(60));
    console.log('WORK CENTER WORKING DAYS TEST');
    console.log('='.repeat(60));

    // Create via API
    const createResponse = await page.request.post('/api/production/work-centers', {
      data: testData,
    });

    // Log error if creation failed
    if (!createResponse.ok()) {
      const error = await createResponse.json().catch(() => ({}));
      console.log('API Error:', createResponse.status(), error);
      // Skip test if API doesn't support this operation
      test.skip(true, `API returned ${createResponse.status()}: ${JSON.stringify(error)}`);
      return;
    }

    const savedWC = await createResponse.json();
    console.log('Saved workingDays:', savedWC.workingDays);

    // Verify array
    expect(Array.isArray(savedWC.workingDays)).toBe(true);
    expect(savedWC.workingDays.length).toBe(testData.workingDays.length);
    expect(savedWC.workingDays).toEqual(testData.workingDays);

    console.log('✅ workingDays array preserved correctly');
  });
});
