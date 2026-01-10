# RTR-MRP HANDOVER DOCUMENT
> Last Updated: 2026-01-10

---

## 🎯 PROJECT OVERVIEW

**RTR-MRP** - Manufacturing Resource Planning System
- **Tech Stack:** Next.js 15, React 19, Prisma, PostgreSQL, TypeScript
- **Repo:** https://github.com/nclamvn/rtr-mrp
- **Production:** https://rtr-mrp.onrender.com
- **Demo:** https://rtr-mrp.onrender.com/demo

---

## ✅ CURRENT STATUS (2026-01-10)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   BUILD: ✅ PASSING                                             │
│   TESTS: ✅ 337 PASSED                                          │
│   HEALTH SCORE: 85/100                                          │
│   DEPLOY: ✅ READY (Render auto-deploy)                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Latest Commits
```
446b020 - test: Add unit tests for validation, error-handler, and memory-cache
780f55a - fix: Replace any types with proper types in error-handler
3416f60 - feat: Apply validation to critical API routes
4cb59f6 - feat: Add API validation infrastructure and type definitions
a115ec2 - feat: Replace Redis with in-memory cache
```

---

## 📊 RECENT COMPLETED WORK (Session 2026-01-09 ~ 2026-01-10)

### 1. Redis → In-Memory Cache ✅
- **Problem:** Render deployment timeout due to Redis connection
- **Solution:** Created `lib/cache/memory-cache.ts` with full functionality
- **Impact:** No more connection timeouts, build passing

### 2. Validation Infrastructure ✅
- `lib/api/validation.ts` - API validation wrapper
- `lib/validations/additional-schemas.ts` - 42+ Zod schemas
- `lib/types/index.ts` - 50+ TypeScript interfaces

### 3. Unit Tests ✅ (NEW)
| Test File | Tests | Coverage |
|-----------|-------|----------|
| `validation-schemas.test.ts` | 24 | Zod schemas |
| `error-handler.test.ts` | ~25 | Error handling |
| `memory-cache.test.ts` | ~45 | Cache, rate-limit, locks |
| `customer-engine.test.ts` | existing | Customer logic |
| `spc-engine.test.ts` | existing | SPC calculations |
| `ml-engine.test.ts` | existing | ML predictions |

### 4. Type Safety Improvements ✅
- Fix `any` types in auth route (7 → 0)
- Fix `any` types in error-handler (5 → 0)
- 68 files with @ts-nocheck (legacy, cần refactor sau)

### 5. Demo Mode System ✅ (Previous)
- **Demo Users:**
  | Role | Email | Password |
  |------|-------|----------|
  | Admin | admin@demo.rtr-mrp.com | Admin@Demo2026! |
  | Manager | manager@demo.rtr-mrp.com | Manager@Demo2026! |
  | Operator | operator@demo.rtr-mrp.com | Operator@Demo2026! |
  | Viewer | viewer@demo.rtr-mrp.com | Viewer@Demo2026! |

### 6. Enterprise Tools v1.2 ✅ (Previous)
- Location: `/enterprise/`
- Migration, Test Data Generator, K6 Capacity Test, Health Check

---

## 🚀 CÔNG VIỆC TIẾP THEO (PRIORITY ORDER)

### HIGH PRIORITY

1. **Excel-like UI System**
   - Plan file: `/Users/mac/.claude/plans/glistening-snacking-dragonfly.md`
   - Mục tiêu: Giao diện bảng giống Excel
   - Components: data-table, smart-grid, domain tables

2. **Add validation to remaining ~30 API routes**
   - Sử dụng wrapper từ `lib/api/validation.ts`

### MEDIUM PRIORITY

3. **Fix legacy Jest tests** (3 files dùng Jest syntax thay Vitest)
4. **Permission UI Components** (from Demo Mode plan)
   - permission-button.tsx
   - action-dropdown.tsx
   - demo-mode-banner.tsx

### LOW PRIORITY

5. Refactor @ts-nocheck files (68 files)
6. Split large files (>800 LOC)
7. Increase test coverage to 80%+
8. Target health score: 95/100

---

## 📁 CẤU TRÚC QUAN TRỌNG

```
src/
├── app/
│   ├── api/                    # API Routes
│   │   ├── v2/                 # V2 API (auth, ai, alerts, etc.)
│   │   ├── mrp/                # MRP routes (run, atp, simulation)
│   │   ├── production/         # Production routes (oee, etc.)
│   │   └── demo/               # Demo mode APIs
│   └── (dashboard)/            # Protected pages
├── lib/
│   ├── cache/memory-cache.ts   # In-memory cache (thay Redis)
│   ├── api/validation.ts       # Validation wrapper
│   ├── validations/            # Zod schemas
│   ├── types/index.ts          # TypeScript types
│   ├── error-handler.ts        # Error handling
│   └── logger.ts               # Logging utility
├── components/
│   └── ui-v2/                  # UI components
└── __tests__/
    └── unit/                   # Unit tests (6 files)

enterprise/                     # Standalone CLI tools (excluded from build)
├── migration/
├── capacity-test/
└── health-check/
```

---

## 🔧 QUICK COMMANDS

```bash
# Development
npm run dev                    # Start dev server (port 3001)

# Testing
npm run test:run               # Run all tests (337 tests)
npm run test:watch             # Watch mode

# Build
npm run build                  # Production build

# Git
git status
git push                       # Trigger Render auto-deploy

# Health check
npm run build && npm run test:run

# Demo APIs (production)
curl -X POST https://rtr-mrp.onrender.com/api/demo/seed
curl https://rtr-mrp.onrender.com/api/demo/check
```

---

## ⚠️ IMPORTANT NOTES

1. **KHÔNG sử dụng Redis** - Đã chuyển sang in-memory cache hoàn toàn
2. **Vitest thay Jest** - Import từ 'vitest', dùng `vi.mock()` thay `jest.mock()`
3. **API routes ở 2 vị trí**: `/api/v2/` (mới) và `/api/` (cũ)
4. **Build warnings** về "Dynamic server usage" là BÌNH THƯỜNG
5. **Auth Secret:** Middleware uses `AUTH_SECRET || NEXTAUTH_SECRET`

---

## 📈 METRICS

| Metric | Giá trị |
|--------|---------|
| Total Tests | 337 |
| Test Files | 16 (13 pass, 3 legacy fail) |
| Zod Schemas | 42+ |
| TypeScript Types | 50+ |
| API Routes | 100+ |
| Health Score | 85/100 |

---

## 🔗 KEY FILES

| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI Kernel config cho Claude |
| `HANDOVER.md` | This file - handover document |
| `vitest.config.ts` | Test configuration |
| `prisma/schema.prisma` | Database schema |
| `src/lib/cache/memory-cache.ts` | Cache implementation |
| `src/lib/error-handler.ts` | Error handling |
| `src/lib/api/validation.ts` | API validation wrapper |

---

## 💡 NEXT SESSION STARTER

Khi quay lại, nói:
> "Đọc HANDOVER.md và tiếp tục công việc"

Hoặc cho task cụ thể:
> "Đọc HANDOVER.md, sau đó implement Excel-like UI"

---

## 📝 SESSION LOG

| Date | Work Done | Commits |
|------|-----------|---------|
| 2026-01-10 | Unit tests, verify deployment | 446b020 |
| 2026-01-09 | Redis removal, validation infrastructure | a115ec2, 4cb59f6, 3416f60, 780f55a |
| 2026-01-06 | Demo mode, Enterprise tools | 2fb897d |

---

*RTR-MRP v1.0 | Updated: 2026-01-10*
