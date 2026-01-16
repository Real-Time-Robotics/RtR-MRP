import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface BugReport {
  id: string;
  module: string;
  testName: string;
  severity: 'Critical' | 'Major' | 'Minor';
  error: string;
  screenshot?: string;
  trace?: string;
  steps?: string[];
  timestamp: string;
  browser?: string;
  duration: number;
}

/**
 * Custom Playwright Reporter for Bug Tracking
 * Generates markdown bug reports from failed tests
 */
class BugReporter implements Reporter {
  private bugs: BugReport[] = [];
  private outputDir: string;
  private startTime: Date = new Date();

  constructor(options: { outputFolder?: string } = {}) {
    this.outputDir = options.outputFolder || 'e2e/reports/bugs';
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.startTime = new Date();
    console.log(`\n🔍 Bug Reporter: Starting test run with ${suite.allTests().length} tests\n`);

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'failed' || result.status === 'timedOut') {
      const bug = this.createBugReport(test, result);
      this.bugs.push(bug);
      console.log(`🐛 Bug detected: [${bug.severity}] ${bug.module} - ${bug.testName}`);
    }
  }

  onEnd(result: FullResult) {
    if (this.bugs.length === 0) {
      console.log('\n✅ Bug Reporter: No bugs detected!\n');
      return;
    }

    const report = this.generateMarkdownReport();
    const filename = `bug-report-${this.formatDate(new Date())}.md`;
    const filepath = path.join(this.outputDir, filename);

    fs.writeFileSync(filepath, report, 'utf-8');
    console.log(`\n📋 Bug Report generated: ${filepath}`);
    console.log(`   Total bugs found: ${this.bugs.length}`);
    console.log(`   Critical: ${this.bugs.filter(b => b.severity === 'Critical').length}`);
    console.log(`   Major: ${this.bugs.filter(b => b.severity === 'Major').length}`);
    console.log(`   Minor: ${this.bugs.filter(b => b.severity === 'Minor').length}\n`);

    // Also generate JSON for CI integration
    const jsonFilename = `bug-report-${this.formatDate(new Date())}.json`;
    const jsonFilepath = path.join(this.outputDir, jsonFilename);
    fs.writeFileSync(jsonFilepath, JSON.stringify(this.bugs, null, 2), 'utf-8');
  }

  private createBugReport(test: TestCase, result: TestResult): BugReport {
    const titleParts = test.titlePath();
    const module = this.extractModule(test);
    const severity = this.determineSeverity(test, result);
    const error = result.error?.message || 'Unknown error';

    // Get screenshot path if exists
    const screenshot = result.attachments.find(a => a.name === 'screenshot')?.path;
    const trace = result.attachments.find(a => a.name === 'trace')?.path;

    return {
      id: `BUG-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      module,
      testName: test.title,
      severity,
      error: this.sanitizeError(error),
      screenshot,
      trace,
      steps: result.steps.map(s => `${s.title} (${s.duration}ms)`),
      timestamp: new Date().toISOString(),
      browser: test.parent?.project()?.name,
      duration: result.duration,
    };
  }

  private extractModule(test: TestCase): string {
    const filepath = test.location.file;
    // Extract module from path like e2e/quality/ncr-management.spec.ts
    const match = filepath.match(/e2e\/([^/]+)\//);
    if (match) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1);
    }
    return 'Unknown';
  }

  private determineSeverity(test: TestCase, result: TestResult): 'Critical' | 'Major' | 'Minor' {
    const testTitle = test.title.toLowerCase();
    const tags = test.tags || [];

    // Check for priority tags
    if (tags.includes('@p0') || tags.includes('@critical')) {
      return 'Critical';
    }
    if (tags.includes('@p1') || tags.includes('@major')) {
      return 'Major';
    }
    if (tags.includes('@p2') || tags.includes('@minor')) {
      return 'Minor';
    }

    // Infer severity from test characteristics
    if (testTitle.includes('create') || testTitle.includes('login') || testTitle.includes('save')) {
      return 'Critical';
    }
    if (testTitle.includes('edit') || testTitle.includes('update') || testTitle.includes('filter')) {
      return 'Major';
    }
    if (result.status === 'timedOut') {
      return 'Major'; // Timeouts are usually significant
    }

    return 'Minor';
  }

  private sanitizeError(error: string): string {
    // Remove ANSI codes and truncate if too long
    const sanitized = error.replace(/\x1B\[[0-9;]*[JKmsu]/g, '');
    return sanitized.length > 500 ? sanitized.substring(0, 500) + '...' : sanitized;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private generateMarkdownReport(): string {
    const criticalBugs = this.bugs.filter(b => b.severity === 'Critical');
    const majorBugs = this.bugs.filter(b => b.severity === 'Major');
    const minorBugs = this.bugs.filter(b => b.severity === 'Minor');

    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - this.startTime.getTime()) / 1000);

    let report = `# Bug Report - ${this.formatDate(new Date())}

## Summary

| Metric | Value |
|--------|-------|
| Total Tests Run | - |
| Total Bugs Found | ${this.bugs.length} |
| Critical | ${criticalBugs.length} |
| Major | ${majorBugs.length} |
| Minor | ${minorBugs.length} |
| Test Duration | ${duration}s |

---

`;

    if (criticalBugs.length > 0) {
      report += `## 🔴 Critical Bugs

| ID | Module | Test | Error | Browser |
|----|--------|------|-------|---------|
${criticalBugs.map(b => `| ${b.id} | ${b.module} | ${b.testName} | ${this.truncate(b.error, 50)} | ${b.browser || '-'} |`).join('\n')}

### Critical Bug Details

${criticalBugs.map(b => this.formatBugDetails(b)).join('\n\n')}

---

`;
    }

    if (majorBugs.length > 0) {
      report += `## 🟠 Major Bugs

| ID | Module | Test | Error | Browser |
|----|--------|------|-------|---------|
${majorBugs.map(b => `| ${b.id} | ${b.module} | ${b.testName} | ${this.truncate(b.error, 50)} | ${b.browser || '-'} |`).join('\n')}

### Major Bug Details

${majorBugs.map(b => this.formatBugDetails(b)).join('\n\n')}

---

`;
    }

    if (minorBugs.length > 0) {
      report += `## 🟡 Minor Bugs

| ID | Module | Test | Error | Browser |
|----|--------|------|-------|---------|
${minorBugs.map(b => `| ${b.id} | ${b.module} | ${b.testName} | ${this.truncate(b.error, 50)} | ${b.browser || '-'} |`).join('\n')}

### Minor Bug Details

${minorBugs.map(b => this.formatBugDetails(b)).join('\n\n')}

---

`;
    }

    report += `## Recommendations

### High Priority Actions
${criticalBugs.length > 0 ? criticalBugs.map(b => `- [ ] Fix ${b.module}: ${b.testName}`).join('\n') : '- No critical issues'}

### Module-wise Summary
${this.getModuleSummary()}

### Performance Observations
${this.getPerformanceObservations()}

---

*Report generated automatically by Bug Reporter*
*Timestamp: ${new Date().toISOString()}*
`;

    return report;
  }

  private formatBugDetails(bug: BugReport): string {
    return `#### ${bug.id}: ${bug.testName}

- **Module:** ${bug.module}
- **Severity:** ${bug.severity}
- **Browser:** ${bug.browser || 'N/A'}
- **Duration:** ${bug.duration}ms
- **Timestamp:** ${bug.timestamp}

**Error:**
\`\`\`
${bug.error}
\`\`\`

${bug.screenshot ? `**Screenshot:** [View](${bug.screenshot})` : ''}
${bug.trace ? `**Trace:** [View](${bug.trace})` : ''}

${bug.steps && bug.steps.length > 0 ? `**Steps:**
${bug.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : ''}`;
  }

  private truncate(str: string, length: number): string {
    const cleaned = str.replace(/\n/g, ' ').replace(/\|/g, '\\|');
    return cleaned.length > length ? cleaned.substring(0, length) + '...' : cleaned;
  }

  private getModuleSummary(): string {
    const moduleCounts: Record<string, number> = {};
    this.bugs.forEach(b => {
      moduleCounts[b.module] = (moduleCounts[b.module] || 0) + 1;
    });

    return Object.entries(moduleCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([module, count]) => `- ${module}: ${count} bug(s)`)
      .join('\n');
  }

  private getPerformanceObservations(): string {
    const slowTests = this.bugs.filter(b => b.duration > 30000);
    if (slowTests.length === 0) {
      return '- No significant performance issues detected';
    }
    return slowTests.map(b => `- ${b.testName} took ${Math.round(b.duration / 1000)}s (consider optimization)`).join('\n');
  }
}

export default BugReporter;
