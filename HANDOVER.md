# RTR-MRP HANDOVER DOCUMENT
> Last Updated: 2026-01-10 11:30

---

## PROJECT OVERVIEW

**RTR-MRP** - Manufacturing Resource Planning System
- **Tech Stack:** Next.js 15, React 19, Prisma ORM, PostgreSQL, TypeScript
- **Repo:** https://github.com/nclamvn/rtr-mrp
- **Production:** https://rtr-mrp.onrender.com
- **Local Dev:** http://localhost:3001
- **Path:** `/Users/mac/AnhQuocLuong/rtr-mrp`

---

## CURRENT STATUS

```
BUILD:        PASSING
TESTS:        337 passed
HEALTH SCORE: 85/100
DEPLOY:       READY (Render auto-deploy on push)
GIT:          Up to date with origin/main
```

### Latest Commits
```
8a21c41 - docs: Update HANDOVER.md with latest session progress
446b020 - test: Add unit tests for validation, error-handler, and memory-cache
780f55a - fix: Replace any types with proper types in error-handler
3416f60 - feat: Apply validation to critical API routes
4cb59f6 - feat: Add API validation infrastructure and type definitions
a115ec2 - feat: Replace Redis with in-memory cache
```

---

## COMPLETED WORK (Recent Sessions)

### 1. Redis Removal (CRITICAL FIX)
- **Problem:** Render deployment timeout due to Redis connection
- **Solution:** Created `lib/cache/memory-cache.ts` with full functionality
- **Status:** COMPLETED - No more connection timeouts

### 2. Validation Infrastructure
- `lib/api/validation.ts` - API validation wrapper
- `lib/validations/additional-schemas.ts` - 42+ Zod schemas
- `lib/types/index.ts` - 50+ TypeScript interfaces

### 3. Unit Tests
| Test File | Tests | Coverage |
|-----------|-------|----------|
| validation-schemas.test.ts | 24 | Zod schemas |
| error-handler.test.ts | ~25 | Error handling |
| memory-cache.test.ts | ~45 | Cache, rate-limit, locks |

### 4. Demo Mode System
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.rtr-mrp.com | Admin@Demo2026! |
| Manager | manager@demo.rtr-mrp.com | Manager@Demo2026! |
| Operator | operator@demo.rtr-mrp.com | Operator@Demo2026! |
| Viewer | viewer@demo.rtr-mrp.com | Viewer@Demo2026! |

### 5. Enterprise Tools v1.2
- Location: `/enterprise/`
- Includes: Migration, Test Data Generator, K6 Capacity Test, Health Check

---

## NEXT PRIORITIES (TASK QUEUE)

### HIGH PRIORITY

1. **Excel-like UI System**
   - Plan file: `/Users/mac/.claude/plans/glistening-snacking-dragonfly.md`
   - Goal: Excel-like grid interface for data tables
   - Components needed: data-table, smart-grid, domain tables

2. **Add validation to remaining ~30 API routes**
   - Use wrapper from `lib/api/validation.ts`
   - Pattern: `withValidation(schema, handler)`

### MEDIUM PRIORITY

3. **Fix legacy Jest tests** (3 files using Jest syntax instead of Vitest)
4. **Permission UI Components**
   - permission-button.tsx
   - action-dropdown.tsx
   - demo-mode-banner.tsx

### LOW PRIORITY

5. Refactor @ts-nocheck files (68 files)
6. Split large files (>800 LOC)
7. Increase test coverage to 80%+

---

## PROJECT STRUCTURE

```
rtr-mrp/
├── src/
│   ├── app/
│   │   ├── api/                    # API Routes
│   │   │   ├── v2/                 # V2 API (auth, ai, alerts)
│   │   │   ├── mrp/                # MRP routes (run, atp)
│   │   │   ├── production/         # Production routes (oee)
│   │   │   └── demo/               # Demo mode APIs
│   │   └── (dashboard)/            # Protected pages
│   ├── lib/
│   │   ├── cache/memory-cache.ts   # In-memory cache (NOT Redis!)
│   │   ├── api/validation.ts       # Validation wrapper
│   │   ├── validations/            # Zod schemas
│   │   ├── types/index.ts          # TypeScript types
│   │   ├── error-handler.ts        # Error handling
│   │   └── logger.ts               # Logging utility
│   └── components/
│       └── ui-v2/                  # UI components
├── __tests__/                      # Test files
├── enterprise/                     # Standalone CLI tools (excluded from build)
├── prisma/schema.prisma            # Database schema (123 models)
└── docs/                           # Documentation
```

---

## QUICK COMMANDS

```bash
# Development
cd /Users/mac/AnhQuocLuong/rtr-mrp
npm run dev                    # Start dev server (port 3001)

# Testing
npm run test:run               # Run all tests
npm run test:watch             # Watch mode

# Build
npm run build                  # Production build

# Health check
npm run build && npm run test:run

# Git
git status
git push                       # Trigger Render auto-deploy
```

---

## CRITICAL NOTES

1. **NO REDIS** - Use `lib/cache/memory-cache.ts` for all caching
2. **Vitest NOT Jest** - Import from 'vitest', use `vi.mock()` not `jest.mock()`
3. **API locations**: Both `/api/v2/` (new) and `/api/` (legacy) exist
4. **Build warnings** about "Dynamic server usage" are NORMAL
5. **Auth Secret:** Uses `AUTH_SECRET || NEXTAUTH_SECRET`

---

## SCHEMA INFO (Correct Version)

Local schema is the **production-ready** version:
- **Total Models:** 123
- **Part.name** (NOT partName)
- **Inventory.quantity** (NOT onHand)
- **Inventory key:** Composite `[partId, warehouseId, lotNumber]`
- **Warehouse model** EXISTS and is required

---

## KEY FILES

| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI configuration for Claude |
| `HANDOVER.md` | This file - session handover |
| `prisma/schema.prisma` | Database schema |
| `src/lib/cache/memory-cache.ts` | Cache (replaces Redis) |
| `src/lib/api/validation.ts` | API validation |
| `vitest.config.ts` | Test configuration |

---

## METRICS

| Metric | Value |
|--------|-------|
| Total Tests | 337 |
| Prisma Models | 123 |
| API Routes | 151 |
| Components | 198 |
| Zod Schemas | 42+ |
| Health Score | 85/100 |

---

## HOW TO CONTINUE

Start new session with:
```
Doc HANDOVER.md va tiep tuc cong viec
```

Or for specific task:
```
Doc HANDOVER.md, sau do implement [task name]
```

---

## SESSION LOG

| Date | Work Done |
|------|-----------|
| 2026-01-10 | Unit tests, build verification, handover doc update |
| 2026-01-09 | Redis removal, validation infrastructure |
| 2026-01-06 | Demo mode, Enterprise tools v1.2 |

---

*RTR-MRP v1.0 | Ready for next session*
