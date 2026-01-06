# RTR-MRP HANDOVER DOCUMENT
> Last Updated: 2026-01-06

---

## PROJECT OVERVIEW

**RTR-MRP** - Manufacturing Resource Planning System
- **Tech Stack:** Next.js 14, Prisma, PostgreSQL, TypeScript
- **Repo:** https://github.com/nclamvn/rtr-mrp
- **Production:** https://rtr-mrp.onrender.com
- **Demo:** https://rtr-mrp.onrender.com/demo

---

## RECENT COMPLETED WORK

### 1. Demo Mode System
- **Status:** COMPLETE
- **Demo Users:**
  | Role | Email | Password |
  |------|-------|----------|
  | Admin | admin@demo.rtr-mrp.com | Admin@Demo2026! |
  | Manager | manager@demo.rtr-mrp.com | Manager@Demo2026! |
  | Operator | operator@demo.rtr-mrp.com | Operator@Demo2026! |
  | Viewer | viewer@demo.rtr-mrp.com | Viewer@Demo2026! |

- **Key Files:**
  - `/src/app/api/demo/seed/route.ts` - Auto-seed demo data
  - `/src/app/api/demo/check/route.ts` - Diagnostic endpoint
  - `/src/app/api/demo/unlock/route.ts` - Unlock locked accounts
  - `/src/middleware.ts` - Fixed AUTH_SECRET for token verification

### 2. Enterprise Tools v1.2
- **Status:** COMPLETE & PUSHED
- **Location:** `/enterprise/`
- **Components:**
  | Tool | File | Purpose |
  |------|------|---------|
  | Migration | `migration/migrate.ts` | Import millions of records |
  | Test Data | `migration/generate-test-data.js` | Generate 1M+ test records |
  | Capacity Test | `capacity-test/capacity-test.js` | K6 load testing |
  | Health Check | `health-check/enterprise-health.ts` | PostgreSQL diagnostics |
  | API Route | `api-routes/enterprise-health-route.ts` | Ready-to-use Next.js route |

- **Note:** Enterprise folder excluded from Next.js build (tsconfig.json)

---

## CURRENT STATUS

### Build Status
- **Latest Commit:** `2fb897d` - exclude enterprise tools from build
- **Build:** Should be PASSING

### Pending Verification
- [ ] Verify Render build passes
- [ ] Test demo login at production URL

---

## KEY CONFIGURATIONS

### Environment Variables (Production)
```
AUTH_SECRET=xxx          # NextAuth v5 token signing
NEXTAUTH_SECRET=xxx      # Legacy (middleware uses AUTH_SECRET || NEXTAUTH_SECRET)
DATABASE_URL=xxx         # PostgreSQL connection
```

### API Routes Structure
```
/api/                    # v1 routes (main)
├── parts/
├── inventory/
├── dashboard/
├── production/
├── mrp/
├── export/
├── health/
└── demo/
    ├── seed/           # POST - seed demo data
    ├── check/          # GET - diagnostic
    └── unlock/         # POST - unlock accounts

/api/v2/                 # v2 routes (some features)
├── reports/
├── supplier/
├── customer/
├── ai/
├── quality/
└── parts-optimized/
```

---

## PLAN FILE (Demo Mode Implementation)

**Location:** `/Users/mac/.claude/plans/harmonic-hatching-acorn.md`

### Remaining Tasks (from plan):
- [ ] Phase 1: Permission UI Components
  - permission-button.tsx
  - action-dropdown.tsx
  - data-table-toolbar.tsx
  - demo-mode-banner.tsx (floating badge)

- [ ] Phase 2: API Permission Middleware
  - with-permission.ts

- [ ] Phase 3: CRUD for all entities
  - Suppliers, Parts, Customers, Sales Orders, Purchase Orders

- [ ] Phase 4: Inventory & Operations
  - Inventory adjustments, Work orders

- [ ] Phase 5: Demo Data Management
  - Demo reset API
  - Role switcher

---

## QUICK COMMANDS

```bash
# Local development
cd /Users/mac/anhquocluong/rtr-mrp
npm run dev

# Seed demo data (production)
curl -X POST https://rtr-mrp.onrender.com/api/demo/seed

# Check demo users
curl https://rtr-mrp.onrender.com/api/demo/check

# Run enterprise tools locally
npm install csv-parse xlsx  # First time only
npx ts-node enterprise/migration/migrate.ts parts ./data.csv --dry-run

# K6 capacity test
k6 run enterprise/capacity-test/capacity-test.js --env BASE_URL=http://localhost:3000
```

---

## IMPORTANT NOTES

1. **Auth Secret:** Middleware uses `AUTH_SECRET || NEXTAUTH_SECRET` to match NextAuth v5 token signing

2. **Schema Fields:**
   - Parts: `partName` (not `name`)
   - Inventory: `quantity` (not `onHand`)

3. **Enterprise Tools:** Standalone CLI tools, not part of web app build

4. **Demo Reset:** Daily auto-reset not yet implemented

---

## NEXT SESSION STARTER

When returning, say:
> "Read HANDOVER.md and continue work"

Or for specific tasks:
> "Read HANDOVER.md, then implement permission-button component"

---

*Generated: 2026-01-06 | RTR-MRP v1.0*
