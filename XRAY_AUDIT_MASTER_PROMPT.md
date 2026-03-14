# 🔬 RTR-MRP X-RAY AUDIT MASTER PROMPT
## Chief Architect Request - Full Project Diagnostic

---

## 📋 MISSION BRIEFING

Bạn là **Senior Technical Auditor** được giao nhiệm vụ thực hiện **X-ray toàn diện** dự án RTR-MRP. Dự án đang trong giai đoạn hoàn thiện nhưng có dấu hiệu:

- ⚠️ **Context drift** - Mất đồng bộ giữa các phần
- ⚠️ **Schema mismatch** - Field names không nhất quán
- ⚠️ **API inconsistency** - Routes v1/v2 lẫn lộn
- ⚠️ **Dead code** - Code không sử dụng
- ⚠️ **Missing implementations** - Features chưa hoàn thiện

**Yêu cầu:** Audit toàn bộ, báo cáo chi tiết tình trạng thực tế.

---

## 🎯 PROJECT CONTEXT

```yaml
Project: RTR-MRP (Real-Time Resource - Material Requirements Planning)
Location: /home/claude/rtr-mrp-app
Stack: Next.js 14 + TypeScript + Prisma + PostgreSQL + Redis
Status: Production Ready (claimed)
Demo: https://rtr-mrp.onrender.com/demo
```

### Expected Structure

```
rtr-mrp-app/
├── app/
│   ├── api/           # API routes
│   └── (dashboard)/   # UI pages
├── components/        # React components
├── lib/              # Core utilities
├── prisma/           # Database schema
├── enterprise/       # Enterprise tools
└── tests/            # Test suites
```

---

## 🔍 X-RAY CHECKLIST

### PHASE 1: SCHEMA AUDIT

```bash
# Execute these commands and report findings:

# 1.1 Check Prisma schema
cat prisma/schema.prisma

# 1.2 Count models
grep -c "^model " prisma/schema.prisma

# 1.3 Verify critical fields
grep -A 15 "^model Part " prisma/schema.prisma
grep -A 15 "^model Inventory " prisma/schema.prisma
grep -A 15 "^model Customer " prisma/schema.prisma
grep -A 15 "^model Supplier " prisma/schema.prisma
```

**Report Required:**
| Model | Field Name Expected | Field Name Actual | Match? |
|-------|---------------------|-------------------|--------|
| Part | partName | ? | ? |
| Part | partNumber (unique) | ? | ? |
| Inventory | onHand | ? | ? |
| Inventory | partId (unique) | ? | ? |
| Customer | code (unique) | ? | ? |
| Supplier | code (unique) | ? | ? |

---

### PHASE 2: API ROUTES AUDIT

```bash
# 2.1 List all API routes
find app/api -name "route.ts" | sort

# 2.2 Check v1 vs v2 distribution
find app/api -name "route.ts" | grep -v v2 | wc -l
find app/api/v2 -name "route.ts" | wc -l

# 2.3 Verify critical endpoints exist
ls -la app/api/parts/
ls -la app/api/inventory/
ls -la app/api/dashboard/
ls -la app/api/mrp/
ls -la app/api/v2/reports/
```

**Report Required:**
| Endpoint | Expected Location | Exists? | Working? |
|----------|-------------------|---------|----------|
| GET /api/parts | app/api/parts/route.ts | ? | ? |
| GET /api/inventory | app/api/inventory/route.ts | ? | ? |
| GET /api/dashboard | app/api/dashboard/route.ts | ? | ? |
| POST /api/mrp/run | app/api/mrp/run/route.ts | ? | ? |
| GET /api/v2/reports | app/api/v2/reports/route.ts | ? | ? |
| GET /api/health | app/api/health/route.ts | ? | ? |

---

### PHASE 3: CODE CONSISTENCY AUDIT

```bash
# 3.1 Check field usage in API routes
grep -r "partName\|\.name" app/api/parts/ --include="*.ts"
grep -r "onHand\|quantity" app/api/inventory/ --include="*.ts"

# 3.2 Check Prisma queries
grep -r "prisma.part" app/api/ --include="*.ts" | head -20
grep -r "prisma.inventory" app/api/ --include="*.ts" | head -20

# 3.3 Check for hardcoded wrong field names
grep -rn "\.name\s*=" app/api/ --include="*.ts" | grep -v "partName\|fileName\|userName"
grep -rn "quantity\s*:" app/api/inventory/ --include="*.ts"
```

**Report Required:**
- [ ] All Part queries use `partName` not `name`
- [ ] All Inventory queries use `onHand` not `quantity`
- [ ] No hardcoded wrong field references
- [ ] Prisma select/include statements are correct

---

### PHASE 4: ENTERPRISE TOOLS AUDIT

```bash
# 4.1 Check enterprise tools exist
ls -la enterprise/
ls -la enterprise/migration/
ls -la enterprise/capacity-test/

# 4.2 Verify migration tool field mappings
grep -A 5 "partName\|name" enterprise/migration/migrate.ts
grep -A 5 "onHand\|quantity" enterprise/migration/migrate.ts

# 4.3 Verify capacity test endpoints
grep "API_V1\|API_V2\|/api/" enterprise/capacity-test/capacity-test.js | head -30
```

**Report Required:**
| Tool | File | Version | Field Mapping | API Endpoints |
|------|------|---------|---------------|---------------|
| Migration | migrate.ts | ? | Correct? | N/A |
| Capacity Test | capacity-test.js | ? | N/A | Correct? |
| Health Check | enterprise-health.ts | ? | N/A | N/A |

---

### PHASE 5: COMPONENT AUDIT

```bash
# 5.1 Count components
find components -name "*.tsx" | wc -l

# 5.2 Check for field mismatches in UI
grep -rn "\.name" components/ --include="*.tsx" | grep -v "className\|fileName\|userName\|displayName" | head -20
grep -rn "quantity" components/ --include="*.tsx" | head -20

# 5.3 Check form field names
grep -rn "name=\"name\"" components/ --include="*.tsx"
grep -rn "name=\"partName\"" components/ --include="*.tsx"
```

**Report Required:**
- [ ] Components use correct field names
- [ ] Forms submit correct data structure
- [ ] No UI/API field mismatch

---

### PHASE 6: DATABASE SYNC AUDIT

```bash
# 6.1 Check migrations
ls -la prisma/migrations/

# 6.2 Check if schema matches DB
npx prisma db pull --print 2>/dev/null || echo "Cannot connect to DB"

# 6.3 Check indexes
cat prisma/migrations/**/migration.sql 2>/dev/null | grep -i "CREATE INDEX" | wc -l
```

**Report Required:**
- [ ] Migrations are up to date
- [ ] Schema matches actual database
- [ ] Indexes are applied

---

### PHASE 7: TEST COVERAGE AUDIT

```bash
# 7.1 Check test files
find tests -name "*.spec.ts" -o -name "*.test.ts" | wc -l
find . -name "*.spec.ts" -o -name "*.test.ts" | wc -l

# 7.2 Check test field usage
grep -rn "partName\|\.name" tests/ --include="*.ts" | head -10
grep -rn "onHand\|quantity" tests/ --include="*.ts" | head -10
```

**Report Required:**
- [ ] Tests use correct field names
- [ ] Test data matches schema
- [ ] No outdated test fixtures

---

### PHASE 8: DEPENDENCY & CONFIG AUDIT

```bash
# 8.1 Check package.json
cat package.json | grep -A 5 '"dependencies"'

# 8.2 Check for outdated/missing deps
npm ls 2>&1 | grep -i "missing\|invalid" | head -10

# 8.3 Check env configuration
cat .env.example 2>/dev/null || cat .env.local 2>/dev/null || echo "No env file found"
```

---

### PHASE 9: DEAD CODE DETECTION

```bash
# 9.1 Find unused exports
grep -rn "export " lib/ --include="*.ts" | head -30

# 9.2 Find TODO/FIXME comments
grep -rn "TODO\|FIXME\|HACK\|XXX" app/ lib/ --include="*.ts" | head -20

# 9.3 Find commented code blocks
grep -rn "^//" app/api/ --include="*.ts" | wc -l
```

---

### PHASE 10: DOCUMENTATION AUDIT

```bash
# 10.1 Check documentation files
ls -la *.md
ls -la docs/ 2>/dev/null

# 10.2 Verify HANDOVER accuracy
cat HANDOVER.md | head -100

# 10.3 Check README
cat README.md
```

---

## 📊 REPORT FORMAT REQUIRED

Generate a comprehensive report in this format:

```markdown
# 🔬 RTR-MRP X-RAY AUDIT REPORT
## Date: [DATE]
## Auditor: Claude (Technical Auditor)

---

## 📊 EXECUTIVE SUMMARY

| Category | Status | Issues Found |
|----------|--------|--------------|
| Schema | 🟢/🟡/🔴 | X issues |
| API Routes | 🟢/🟡/🔴 | X issues |
| Code Consistency | 🟢/🟡/🔴 | X issues |
| Enterprise Tools | 🟢/🟡/🔴 | X issues |
| Components | 🟢/🟡/🔴 | X issues |
| Database | 🟢/🟡/🔴 | X issues |
| Tests | 🟢/🟡/🔴 | X issues |
| Dependencies | 🟢/🟡/🔴 | X issues |

**Overall Health:** X/100

---

## 🔴 CRITICAL ISSUES (Must Fix)

1. [Issue description]
   - Location: [file:line]
   - Expected: [what should be]
   - Actual: [what is]
   - Fix: [how to fix]

---

## 🟡 WARNINGS (Should Fix)

1. [Warning description]
   - Location: [file:line]
   - Impact: [what could go wrong]
   - Recommendation: [suggested action]

---

## 🟢 VERIFIED OK

1. [What was checked and confirmed working]

---

## 📋 FIELD MAPPING MATRIX

| Location | Expected Field | Actual Field | Status |
|----------|----------------|--------------|--------|
| prisma/schema.prisma:Part | partName | ? | ? |
| prisma/schema.prisma:Inventory | onHand | ? | ? |
| app/api/parts/route.ts | partName | ? | ? |
| app/api/inventory/route.ts | onHand | ? | ? |
| enterprise/migration/migrate.ts | partName alias | ? | ? |
| enterprise/capacity-test/capacity-test.js | /api/* | ? | ? |
| components/parts/* | partName | ? | ? |

---

## 🔧 RECOMMENDED FIXES

### Priority 1 (Critical)
- [ ] Fix [issue]

### Priority 2 (Important)
- [ ] Fix [issue]

### Priority 3 (Nice to have)
- [ ] Fix [issue]

---

## 📈 METRICS

- Total Models: X
- Total API Routes: X
- Total Components: X
- Total Tests: X
- Code Coverage: X%
- Schema Consistency: X%
- API Consistency: X%

---

## ✅ VERIFICATION COMMANDS

After fixes, run these to verify:
\`\`\`bash
# Command 1
# Command 2
\`\`\`
```

---

## ⚠️ KNOWN CONTEXT FROM PREVIOUS SESSIONS

**Đây là những gì ĐƯỢC CHO LÀ đúng (cần verify):**

1. **Schema:**
   - Part uses `partName` (not `name`)
   - Inventory uses `onHand` (not `quantity`)
   - Inventory.partId is UNIQUE (no warehouse FK)

2. **API:**
   - Primary routes at `/api/*` (v1)
   - Only `/api/v2/reports` exists in v2
   - Other v2 routes do NOT exist

3. **Enterprise Tools v1.2:**
   - Migration accepts aliases: `name`→`partName`, `quantity`→`onHand`
   - Capacity test uses `/api/*` endpoints

4. **Demo:**
   - URL: https://rtr-mrp.onrender.com/demo
   - Credentials: admin@demo.rtr-mrp.com / Admin@Demo2026!

**⚠️ DO NOT TRUST THIS - VERIFY EVERYTHING!**

---

## 🚀 EXECUTION INSTRUCTIONS

1. **Read this entire prompt first**
2. **Execute PHASE 1-10 systematically**
3. **Document ALL findings** - even small discrepancies
4. **Generate the report** in the specified format
5. **Prioritize issues** by severity
6. **Provide actionable fixes** with exact file:line references

**Output:** Save report to `/mnt/user-data/outputs/RTR_MRP_XRAY_REPORT_[DATE].md`

---

## 🎯 SUCCESS CRITERIA

The audit is complete when:

- [ ] All 10 phases executed
- [ ] All field mappings verified
- [ ] All API routes tested
- [ ] All discrepancies documented
- [ ] Fixes prioritized
- [ ] Report generated

---

*Master Prompt v1.0 - Chief Architect Request*
*Generated: 2026-01-06*
