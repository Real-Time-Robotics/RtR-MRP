import { Page, expect } from '@playwright/test';

/**
 * Quality Module E2E Test Helpers
 * Specialized helpers for testing quality management features
 */

// ============================================
// NCR HELPERS
// ============================================

/**
 * Navigate to NCR list page
 */
export async function navigateToNCRList(page: Page) {
  await page.goto('/quality/ncr');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
}

/**
 * Open NCR creation form
 */
export async function openNCRCreationForm(page: Page) {
  const createButton = page.locator(
    'button:has-text("Create NCR"), button:has-text("New NCR"), button:has-text("Tạo NCR"), ' +
    'button:has-text("Add"), a:has-text("Create NCR"), [data-testid="create-ncr-button"]'
  ).first();

  if (await createButton.isVisible()) {
    await createButton.click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

/**
 * Fill NCR form with test data
 */
export async function fillNCRForm(page: Page, ncrData: {
  ncrNumber?: string;
  title?: string;
  type?: string;
  severity?: string;
  description?: string;
  partNumber?: string;
  quantity?: number;
  lotNumber?: string;
}) {
  // Fill NCR number if field exists
  const ncrNumberInput = page.locator('input[name*="ncrNumber"], input[name*="ncr_number"], input[placeholder*="NCR"]').first();
  if (await ncrNumberInput.isVisible() && ncrData.ncrNumber) {
    await ncrNumberInput.fill(ncrData.ncrNumber);
  }

  // Fill title
  const titleInput = page.locator('input[name*="title"], input[placeholder*="Title"], input[placeholder*="Tiêu đề"]').first();
  if (await titleInput.isVisible() && ncrData.title) {
    await titleInput.fill(ncrData.title);
  }

  // Select type if dropdown exists
  if (ncrData.type) {
    await selectDropdownOption(page, 'type', ncrData.type);
  }

  // Select severity if dropdown exists
  if (ncrData.severity) {
    await selectDropdownOption(page, 'severity', ncrData.severity);
  }

  // Fill description
  const descriptionInput = page.locator('textarea[name*="description"], textarea[placeholder*="Description"]').first();
  if (await descriptionInput.isVisible() && ncrData.description) {
    await descriptionInput.fill(ncrData.description);
  }

  // Fill part number
  const partNumberInput = page.locator('input[name*="part"], input[placeholder*="Part"]').first();
  if (await partNumberInput.isVisible() && ncrData.partNumber) {
    await partNumberInput.fill(ncrData.partNumber);
  }

  // Fill quantity
  const quantityInput = page.locator('input[name*="quantity"], input[type="number"]').first();
  if (await quantityInput.isVisible() && ncrData.quantity) {
    await quantityInput.fill(ncrData.quantity.toString());
  }

  // Fill lot number
  const lotInput = page.locator('input[name*="lot"], input[placeholder*="Lot"]').first();
  if (await lotInput.isVisible() && ncrData.lotNumber) {
    await lotInput.fill(ncrData.lotNumber);
  }
}

/**
 * Submit NCR form
 */
export async function submitNCRForm(page: Page) {
  const submitButton = page.locator(
    'button:has-text("Save"), button:has-text("Create"), button:has-text("Submit"), ' +
    'button:has-text("Lưu"), button[type="submit"]'
  ).first();

  if (await submitButton.isVisible()) {
    await submitButton.click();
    await page.waitForTimeout(2000);
    return true;
  }
  return false;
}

/**
 * Change NCR status
 */
export async function changeNCRStatus(page: Page, newStatus: string) {
  // Look for status dropdown or button
  const statusControl = page.locator(
    'select[name*="status"], button:has-text("Status"), ' +
    '[data-testid="status-dropdown"], button:has-text("Change Status")'
  ).first();

  if (await statusControl.isVisible()) {
    await statusControl.click();
    await page.waitForTimeout(300);

    const option = page.locator(`[role="option"]:has-text("${newStatus}"), option:has-text("${newStatus}")`).first();
    if (await option.isVisible()) {
      await option.click();
      await page.waitForTimeout(500);
      return true;
    }
  }
  return false;
}

// ============================================
// CAPA HELPERS
// ============================================

/**
 * Navigate to CAPA list page
 */
export async function navigateToCAPAList(page: Page) {
  await page.goto('/quality/capa');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
}

/**
 * Open CAPA creation form
 */
export async function openCAPACreationForm(page: Page) {
  const createButton = page.locator(
    'button:has-text("Create CAPA"), button:has-text("New CAPA"), ' +
    'button:has-text("Tạo CAPA"), button:has-text("Add"), [data-testid="create-capa-button"]'
  ).first();

  if (await createButton.isVisible()) {
    await createButton.click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

/**
 * Fill CAPA form with test data
 */
export async function fillCAPAForm(page: Page, capaData: {
  capaNumber?: string;
  title?: string;
  type?: string;
  priority?: string;
  problemDescription?: string;
  rootCauseAnalysis?: string;
  targetCompletionDate?: string;
}) {
  // Fill CAPA number
  const capaNumberInput = page.locator('input[name*="capaNumber"], input[name*="capa_number"]').first();
  if (await capaNumberInput.isVisible() && capaData.capaNumber) {
    await capaNumberInput.fill(capaData.capaNumber);
  }

  // Fill title
  const titleInput = page.locator('input[name*="title"], input[placeholder*="Title"]').first();
  if (await titleInput.isVisible() && capaData.title) {
    await titleInput.fill(capaData.title);
  }

  // Select type
  if (capaData.type) {
    await selectDropdownOption(page, 'type', capaData.type);
  }

  // Select priority
  if (capaData.priority) {
    await selectDropdownOption(page, 'priority', capaData.priority);
  }

  // Fill problem description
  const problemInput = page.locator('textarea[name*="problem"], textarea[name*="description"]').first();
  if (await problemInput.isVisible() && capaData.problemDescription) {
    await problemInput.fill(capaData.problemDescription);
  }

  // Fill root cause analysis
  const rcaInput = page.locator('textarea[name*="rootCause"], textarea[name*="root_cause"], textarea[name*="rca"]').first();
  if (await rcaInput.isVisible() && capaData.rootCauseAnalysis) {
    await rcaInput.fill(capaData.rootCauseAnalysis);
  }

  // Fill target date
  const dateInput = page.locator('input[name*="targetDate"], input[name*="target_date"], input[type="date"]').first();
  if (await dateInput.isVisible() && capaData.targetCompletionDate) {
    await dateInput.fill(capaData.targetCompletionDate);
  }
}

/**
 * Add action item to CAPA
 */
export async function addCAPAAction(page: Page, actionData: {
  description: string;
  assignee?: string;
  dueDate?: string;
}) {
  const addActionButton = page.locator(
    'button:has-text("Add Action"), button:has-text("Thêm hành động"), [data-testid="add-action-button"]'
  ).first();

  if (await addActionButton.isVisible()) {
    await addActionButton.click();
    await page.waitForTimeout(300);

    const actionInput = page.locator('textarea[name*="action"], input[name*="action"]').last();
    if (await actionInput.isVisible()) {
      await actionInput.fill(actionData.description);
    }

    if (actionData.assignee) {
      const assigneeInput = page.locator('input[name*="assignee"], select[name*="assignee"]').last();
      if (await assigneeInput.isVisible()) {
        await assigneeInput.fill(actionData.assignee);
      }
    }

    return true;
  }
  return false;
}

// ============================================
// INSPECTION HELPERS
// ============================================

/**
 * Navigate to inspection plans page
 */
export async function navigateToInspectionPlans(page: Page) {
  await page.goto('/quality/inspection-plans');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
}

/**
 * Navigate to inspection records page
 */
export async function navigateToInspectionRecords(page: Page) {
  await page.goto('/quality/inspections');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
}

/**
 * Start new inspection
 */
export async function startInspection(page: Page, type: 'receiving' | 'in-process' | 'final') {
  const buttonText = {
    'receiving': ['Receiving Inspection', 'Kiểm tra nhận hàng'],
    'in-process': ['In-Process Inspection', 'Kiểm tra quá trình'],
    'final': ['Final Inspection', 'Kiểm tra cuối cùng'],
  };

  for (const text of buttonText[type]) {
    const button = page.locator(`button:has-text("${text}"), a:has-text("${text}")`).first();
    if (await button.isVisible()) {
      await button.click();
      await page.waitForTimeout(500);
      return true;
    }
  }

  // Fallback to generic create button
  const createButton = page.locator('button:has-text("New Inspection"), button:has-text("Create")').first();
  if (await createButton.isVisible()) {
    await createButton.click();
    await page.waitForTimeout(500);
    return true;
  }

  return false;
}

/**
 * Record measurement value
 */
export async function recordMeasurement(page: Page, characteristicIndex: number, value: number | string) {
  const measurementInputs = page.locator('input[name*="measurement"], input[name*="value"], input[type="number"]');
  const input = measurementInputs.nth(characteristicIndex);

  if (await input.isVisible()) {
    await input.fill(value.toString());
    return true;
  }
  return false;
}

/**
 * Submit inspection result
 */
export async function submitInspectionResult(page: Page, result: 'pass' | 'fail') {
  const buttonText = result === 'pass' ? ['Pass', 'Approve', 'Đạt', 'Accept'] : ['Fail', 'Reject', 'Không đạt'];

  for (const text of buttonText) {
    const button = page.locator(`button:has-text("${text}")`).first();
    if (await button.isVisible()) {
      await button.click();
      await page.waitForTimeout(1000);
      return true;
    }
  }
  return false;
}

/**
 * Add inspection characteristic
 */
export async function addInspectionCharacteristic(page: Page, characteristic: {
  name: string;
  type?: string;
  specification?: string;
  nominalValue?: number;
  upperLimit?: number;
  lowerLimit?: number;
}) {
  const addButton = page.locator(
    'button:has-text("Add Characteristic"), button:has-text("Add"), button:has-text("Thêm đặc tính")'
  ).first();

  if (await addButton.isVisible()) {
    await addButton.click();
    await page.waitForTimeout(300);

    const nameInput = page.locator('input[name*="characteristicName"], input[name*="name"]').last();
    if (await nameInput.isVisible()) {
      await nameInput.fill(characteristic.name);
    }

    if (characteristic.specification) {
      const specInput = page.locator('input[name*="spec"], input[name*="specification"]').last();
      if (await specInput.isVisible()) {
        await specInput.fill(characteristic.specification);
      }
    }

    return true;
  }
  return false;
}

// ============================================
// CERTIFICATE HELPERS
// ============================================

/**
 * Navigate to certificates page
 */
export async function navigateToCertificates(page: Page) {
  await page.goto('/quality/certificates');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
}

/**
 * Generate Certificate of Conformance
 */
export async function generateCOC(page: Page, orderReference?: string) {
  const generateButton = page.locator(
    'button:has-text("Generate COC"), button:has-text("Create Certificate"), ' +
    'button:has-text("Tạo chứng nhận"), [data-testid="generate-coc-button"]'
  ).first();

  if (await generateButton.isVisible()) {
    await generateButton.click();
    await page.waitForTimeout(500);

    if (orderReference) {
      const orderInput = page.locator('input[name*="order"], input[placeholder*="Order"]').first();
      if (await orderInput.isVisible()) {
        await orderInput.fill(orderReference);
      }
    }

    return true;
  }
  return false;
}

/**
 * Approve certificate
 */
export async function approveCertificate(page: Page) {
  const approveButton = page.locator(
    'button:has-text("Approve"), button:has-text("Issue"), button:has-text("Phê duyệt")'
  ).first();

  if (await approveButton.isVisible()) {
    await approveButton.click();
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

/**
 * Download certificate PDF
 */
export async function downloadCertificatePDF(page: Page) {
  const downloadButton = page.locator(
    'button:has-text("Download"), button:has-text("PDF"), button:has-text("Export"), a:has-text("Download")'
  ).first();

  if (await downloadButton.isVisible()) {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
      downloadButton.click(),
    ]);
    return download !== null;
  }
  return false;
}

// ============================================
// UTILITY HELPERS
// ============================================

/**
 * Select option from dropdown (handles both select and custom dropdowns)
 */
export async function selectDropdownOption(page: Page, fieldName: string, value: string) {
  // Try native select first
  const select = page.locator(`select[name*="${fieldName}"]`).first();
  if (await select.isVisible()) {
    await select.selectOption({ label: value });
    return true;
  }

  // Try custom dropdown (button + options)
  const dropdownButton = page.locator(
    `button:has-text("${fieldName}"), [data-testid="${fieldName}-dropdown"], ` +
    `[role="combobox"][aria-label*="${fieldName}"]`
  ).first();

  if (await dropdownButton.isVisible()) {
    await dropdownButton.click();
    await page.waitForTimeout(200);

    const option = page.locator(`[role="option"]:has-text("${value}"), [data-value="${value}"]`).first();
    if (await option.isVisible()) {
      await option.click();
      return true;
    }
  }

  return false;
}

/**
 * Filter quality records by status
 */
export async function filterByStatus(page: Page, status: string) {
  const statusFilter = page.locator(
    'select[name*="status"], button:has-text("Status"), [data-testid="status-filter"]'
  ).first();

  if (await statusFilter.isVisible()) {
    await statusFilter.click();
    await page.waitForTimeout(200);

    const option = page.locator(`[role="option"]:has-text("${status}"), option:has-text("${status}")`).first();
    if (await option.isVisible()) {
      await option.click();
      await page.waitForTimeout(500);
      return true;
    }
  }
  return false;
}

/**
 * Filter quality records by date range
 */
export async function filterByDateRange(page: Page, startDate: string, endDate: string) {
  const startInput = page.locator('input[name*="startDate"], input[name*="from"], input[placeholder*="From"]').first();
  const endInput = page.locator('input[name*="endDate"], input[name*="to"], input[placeholder*="To"]').first();

  if (await startInput.isVisible()) {
    await startInput.fill(startDate);
  }
  if (await endInput.isVisible()) {
    await endInput.fill(endDate);
  }

  // Trigger filter if there's an apply button
  const applyButton = page.locator('button:has-text("Apply"), button:has-text("Filter")').first();
  if (await applyButton.isVisible()) {
    await applyButton.click();
    await page.waitForTimeout(500);
  }

  return true;
}

/**
 * Upload attachment to quality record
 */
export async function uploadAttachment(page: Page, filePath: string) {
  const fileInput = page.locator('input[type="file"]').first();

  if (await fileInput.count() > 0) {
    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

/**
 * Verify quality record appears in list
 */
export async function verifyRecordInList(page: Page, identifier: string) {
  const row = page.locator(`tr:has-text("${identifier}"), [data-testid="record-${identifier}"]`).first();
  return await row.isVisible({ timeout: 5000 }).catch(() => false);
}

/**
 * Get quality metrics from dashboard
 */
export async function getQualityMetrics(page: Page): Promise<{
  ncrCount?: number;
  capaCount?: number;
  openInspections?: number;
}> {
  const metrics: Record<string, number> = {};

  const ncrMetric = page.locator('[data-metric="ncr-count"], .ncr-count').first();
  if (await ncrMetric.isVisible()) {
    const text = await ncrMetric.textContent();
    if (text) metrics.ncrCount = parseInt(text.replace(/\D/g, '')) || 0;
  }

  const capaMetric = page.locator('[data-metric="capa-count"], .capa-count').first();
  if (await capaMetric.isVisible()) {
    const text = await capaMetric.textContent();
    if (text) metrics.capaCount = parseInt(text.replace(/\D/g, '')) || 0;
  }

  return metrics;
}

/**
 * Wait for quality data to load
 */
export async function waitForQualityDataLoad(page: Page) {
  await page.waitForSelector('[data-loading="true"], .loading, .animate-spin', {
    state: 'hidden',
    timeout: 30000,
  }).catch(() => {});
  await page.waitForTimeout(500);
}

/**
 * Verify toast message appears
 */
export async function verifyToast(page: Page, expectedMessage: string, timeout = 5000) {
  const toast = page.locator(
    `[role="alert"]:has-text("${expectedMessage}"), ` +
    `.toast:has-text("${expectedMessage}"), ` +
    `[data-sonner-toast]:has-text("${expectedMessage}")`
  ).first();

  return await toast.isVisible({ timeout }).catch(() => false);
}
