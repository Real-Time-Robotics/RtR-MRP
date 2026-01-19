# 🔄 RTR-MRP PROJECT HANDOVER
## Document di cư ngữ cảnh dự án - Version 2026-01-06

---

## 📌 THÔNG TIN NHANH

| Attribute | Value |
|-----------|-------|
| **Project** | RTR-MRP (Real-Time Resource - Material Requirements Planning) |
| **Stack** | Next.js 14 + TypeScript + Prisma + PostgreSQL + Redis + AI (Gemini/OpenAI) |
| **Repo Location** | `/Users/mac/AnhQuocLuong/rtr-mrp` |
| **Status** | ✅ Production Ready - Enterprise Scale + AI Maturity 80% |
| **Live Demo** | https://rtr-mrp.onrender.com/demo |
| **Last Update** | 2026-01-19 |
| **AI Maturity** | 80% (Phase 3 Complete) |

---

## 🏗️ KIẾN TRÚC HỆ THỐNG

### Tech Stack

```
Frontend:     Next.js 14 (App Router) + React 18 + TailwindCSS + shadcn/ui
Backend:      Next.js API Routes + Prisma ORM
Database:     PostgreSQL 15 (100+ production indexes)
Cache:        Redis 7 (session + query cache)
Queue:        BullMQ (background jobs)
Storage:      S3-compatible (file uploads)
Auth:         NextAuth.js + JWT + RBAC (4 roles)
Testing:      Jest + Playwright (629 E2E tests) + K6 (load testing)
```

### Cấu trúc thư mục chính

```
rtr-mrp-app/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (v1)
│   │   ├── auth/
│   │   ├── parts/
│   │   ├── inventory/
│   │   ├── production/
│   │   ├── mrp/
│   │   ├── dashboard/
│   │   ├── export/
│   │   ├── health/
│   │   ├── enterprise/    # 🆕 Enterprise health endpoint
│   │   └── v2/            # V2 API (partial migration)
│   │       ├── reports/
│   │       ├── mrp/
│   │       └── ...
│   ├── (auth)/            # Auth pages
│   ├── (dashboard)/       # Dashboard pages
│   └── demo/              # Demo mode
├── components/            # React components (100+)
├── lib/                   # Core libraries
│   ├── prisma.ts         # Prisma client
│   ├── auth/             # Auth utilities
│   ├── validation/       # Zod schemas
│   ├── security/         # Sanitization
│   ├── optimization/     # 🆕 Performance modules
│   │   ├── database/     # Batch ops, streaming
│   │   ├── api/          # Rate limiting, caching
│   │   ├── processing/   # CSV/Excel processing
│   │   ├── resilience/   # Circuit breaker, retry
│   │   └── monitoring/   # Metrics, alerts
│   └── error-handler.ts
├── prisma/
│   ├── schema.prisma     # 34 models
│   └── migrations/
│       └── production_indexes.sql  # 100+ indexes
├── enterprise/           # 🆕 Enterprise tools
│   ├── migration/        # Data migration (millions records)
│   ├── capacity-test/    # K6 load testing
│   ├── health-check/     # System diagnostics
│   └── docs/             # Enterprise documentation
├── scripts/
│   └── maintenance/      # DB maintenance scripts
└── tests/
    ├── e2e/              # 629 Playwright tests
    └── load/             # K6 + Artillery tests
```

---

## 📊 DATABASE SCHEMA (123 Models) - VERIFIED 2026-01-09

### Core Models - CHÍNH XÁC

```prisma
// ✅ VERIFIED CORRECT FIELD NAMES

model Part {
  id            String   @id @default(cuid())
  partNumber    String   @unique          // Unique identifier
  name          String                    // ✅ ĐÚNG: 'name' (KHÔNG PHẢI 'partName')
  description   String?
  category      PartCategory @default(COMPONENT)
  unit          String   @default("pcs")
  unitCost      Float    @default(0)
  // Stock control fields ON Part model:
  minStock      Int      @default(0)
  maxStock      Int?
  reorderPoint  Int      @default(0)
  safetyStock   Int      @default(0)
  critical      Boolean  @default(false)
  lotControl    Boolean  @default(false)
  serialControl Boolean  @default(false)
  // ... more fields
}

model Inventory {
  id            String   @id @default(cuid())
  partId        String                    // NOT unique - part of composite key
  warehouseId   String                    // Required for composite key
  lotNumber     String?                   // Part of composite key
  quantity      Float    @default(0)      // ✅ ĐÚNG: 'quantity' (KHÔNG PHẢI 'onHand')
  reservedQty   Float    @default(0)
  availableQty  Float    @default(0)
  // ...
  
  @@unique([partId, warehouseId, lotNumber])  // ✅ COMPOSITE KEY
}

model Warehouse {  // ✅ MODEL TỒN TẠI
  id            String   @id @default(cuid())
  code          String   @unique
  name          String
  type          String
  status        String   @default("active")
  // ...
}
```

### ⚠️ CRITICAL - ĐÃ XÁC NHẬN

| Entity | Field | Đúng | Sai (cũ) |
|--------|-------|------|----------|
| Part | Tên | `name` | ~~partName~~ |
| Inventory | Số lượng | `quantity` | ~~onHand~~ |
| Inventory | Key | Composite `[partId, warehouseId, lotNumber]` | ~~partId unique~~ |
| Warehouse | Model | ✅ Tồn tại | ~~Không có~~ |

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### RBAC Roles

| Role | Parts | Inventory | Production | Reports | Users |
|------|-------|-----------|------------|---------|-------|
| ADMIN | CRUD | CRUD | CRUD | ✅ | CRUD |
| MANAGER | CRUD | CRUD | CRUD | ✅ | Read |
| OPERATOR | Read | Update | CRUD | ❌ | ❌ |
| VIEWER | Read | Read | Read | ✅ | ❌ |

### Demo Credentials

```
Admin:    admin@demo.rtr-mrp.com    / Admin@Demo2026!
Manager:  manager@demo.rtr-mrp.com  / Manager@Demo2026!
Operator: operator@demo.rtr-mrp.com / Operator@Demo2026!
Viewer:   viewer@demo.rtr-mrp.com   / Viewer@Demo2026!
```

---

## 🚀 API ENDPOINTS - QUAN TRỌNG

### V1 Routes (`/api/*`) - PRIMARY (hầu hết dùng này)

```
GET/POST   /api/parts              - Parts CRUD
GET/POST   /api/inventory          - Inventory management
POST       /api/inventory/movements - Stock movements
GET/POST   /api/production         - Work orders
GET/POST   /api/customers          - Customer management
GET/POST   /api/suppliers          - Supplier management
GET        /api/dashboard          - Dashboard aggregations
POST       /api/mrp/run            - Trigger MRP calculation
GET        /api/export             - Bulk data export
GET        /api/health             - Basic health check
GET        /api/enterprise/health  - 🆕 Enterprise diagnostics
```

### V2 Routes (`/api/v2/*`) - PARTIAL (chỉ một số)

```
GET        /api/v2/reports         - Advanced reporting ✅ EXISTS
POST       /api/v2/mrp/run         - MRP with capacity check
GET        /api/v2/mrp/capacity-check
```

### ⚠️ ROUTES KHÔNG TỒN TẠI

```
❌ /api/v2/parts           → Dùng /api/parts
❌ /api/v2/inventory       → Dùng /api/inventory
❌ /api/v2/dashboard       → Dùng /api/dashboard
❌ /api/v2/production      → Dùng /api/production
❌ /api/inventory/adjust   → Dùng /api/inventory/movements
```

---

## 🤖 AI CAPABILITIES (Phase 3 Complete - 2026-01-19)

### AI Maturity: 80%

| Phase | Feature | Status | Lines of Code |
|-------|---------|--------|---------------|
| Phase 1 | AI Foundation | ✅ Complete | ~3,000 |
| Phase 2 | Quality & Supplier AI | ✅ Complete | ~5,000 |
| Phase 3 | Autonomous Operations | ✅ Complete | ~10,000 |

### Phase 3 Features (Complete)

#### 1. Auto-PO System (`src/lib/ai/autonomous/`)
- **po-suggestion-engine.ts** - Generates PO suggestions from inventory/forecast
- **ai-po-analyzer.ts** - AI analysis with confidence scoring
- **approval-queue-service.ts** - Multi-level approval workflow
- **po-executor.ts** - Auto-execution for approved POs

#### 2. Auto-Scheduling System (`src/lib/ai/autonomous/`)
- **scheduling-engine.ts** - Work order scheduling optimization
- **schedule-optimizer.ts** - Resource balancing and conflict resolution
- **conflict-detector.ts** - Detects scheduling conflicts
- **ai-scheduler-analyzer.ts** - AI-powered schedule analysis
- **schedule-executor.ts** - Auto-applies optimized schedules

#### 3. Intelligent Alerts System (`src/lib/ai/alerts/`)
- **alert-types.ts** - Enums and interfaces (AlertType, AlertPriority, AlertSource)
- **alert-aggregator.ts** - Collects from all AI sources
- **alert-processor.ts** - Priority assignment, escalation rules
- **ai-alert-analyzer.ts** - AI summaries in Vietnamese, correlation
- **notification-engine.ts** - In-app and email notifications
- **alert-action-executor.ts** - One-click actions

### AI API Routes

```
# Auto-PO
GET/POST   /api/ai/auto-po             - PO suggestions
GET        /api/ai/auto-po/queue       - Approval queue
POST       /api/ai/auto-po/execute     - Execute approved POs

# Auto-Schedule
GET/POST   /api/ai/auto-schedule       - Schedule operations
GET        /api/ai/auto-schedule/conflicts
POST       /api/ai/auto-schedule/apply

# Intelligent Alerts
GET/POST   /api/ai/alerts              - Alert management
GET        /api/ai/alerts/[alertId]    - Alert details
GET        /api/ai/alerts/counts       - Alert statistics
GET        /api/ai/alerts/digest       - Daily/weekly digest
GET/PUT    /api/ai/alerts/preferences  - User preferences
```

### AI UI Pages

```
/ai/auto-po          - Auto-PO Dashboard
/ai/auto-schedule    - Auto-Schedule Dashboard
/ai/alerts           - Alert Center (unified)
/ai/alerts/[alertId] - Alert Detail
```

### Previous AI Features (Phase 1-2)

| Feature | Location | Description |
|---------|----------|-------------|
| Demand Forecast | `src/lib/ai/forecast/` | ML-based demand prediction |
| Quality Prediction | `src/lib/ai/quality/` | Defect prediction, SPC |
| Supplier Risk | `src/lib/ai/supplier-risk/` | Risk scoring, early warning |
| What-If Simulation | `src/lib/ai/simulation/` | Monte Carlo simulation |
| AI Chat | `src/lib/ai/` | Natural language queries |
| Document OCR | `src/lib/ai/` | AI vision document processing |
| Email Parsing | `src/lib/ai/` | Order import from emails |
| RAG Knowledge Base | `src/lib/ai/` | Context-aware responses |

---

## 📦 ENTERPRISE TOOLS (v1.3) - FIXED 2026-01-09

### Location
- Source: `/enterprise/` (local machine)
- Package: Available on request

### Components

| Tool | File | Status |
|------|------|--------|
| **Migration** | `migration/migrate.ts` | ✅ Fixed field names |
| **Test Data** | `migration/generate-test-data.js` | ✅ Updated |
| **Capacity Test** | `capacity-test/capacity-test.js` | ✅ Correct endpoints |
| **Health Check** | `health-check/enterprise-health.ts` | ✅ Works |

### Migration Tool - Field Mapping (CORRECT)

```typescript
// Parts: uses 'name' (correct)
name: transformed.partName || transformed.name,

// Inventory: uses 'quantity' (correct) + composite key
quantity: transformed.quantity,
warehouseId: warehouseId,  // Required
lotNumber: transformed.lotNumber || null,

// Composite key lookup
@@unique([partId, warehouseId, lotNumber])
```

### Usage

```bash
# Generate test data
node enterprise/migration/generate-test-data.js ./test-data 100000

# Dry run
npx ts-node enterprise/migration/migrate.ts parts ./data.csv --dry-run

# Import (order matters!)
npx ts-node enterprise/migration/migrate.ts parts ./data.csv --batch-size=1000
npx ts-node enterprise/migration/migrate.ts customers ./data.csv
npx ts-node enterprise/migration/migrate.ts suppliers ./data.csv
npx ts-node enterprise/migration/migrate.ts inventory ./data.csv  # Needs warehouse!
```

### Capacity Test

```bash
k6 run enterprise/capacity-test/capacity-test.js --env BASE_URL=https://app.com

# All 6 scenarios use /api/* (v1) endpoints
```

---

## ⚡ PERFORMANCE & CAPACITY

### Benchmarks Achieved

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Parts list (1000) | 450ms | 25ms | **18x** |
| Parts search | 320ms | 35ms | **9x** |
| Dashboard load | 1200ms | 180ms | **6.7x** |
| Bulk import (10K) | 45s | 3.5s | **13x** |

### Capacity Rating

| Scale | Parts | RAM | Users | Status |
|-------|-------|-----|-------|--------|
| Medium | 100K-1M | 16GB | 100 | ✅ |
| Large | 1M-5M | 64GB | 500 | ✅ |
| Enterprise | 5M+ | 128GB+ | 1000+ | ✅ (cần cluster) |

### So sánh thị trường

```
RTR-MRP positioning: Mid-market ERP (tương đương Odoo, ERPNext)
- Smaller than: SAP B1, NetSuite
- Similar to: Odoo MRP, ERPNext
- Larger than: Fishbowl, Zoho Inventory
```

---

## 📋 COMPLETED FEATURES

### Core
- [x] 34 Prisma models
- [x] 55+ API endpoints
- [x] RBAC 4 roles
- [x] Multi-tenant ready
- [x] 100+ database indexes

### Enterprise
- [x] Background jobs (BullMQ)
- [x] File storage (S3)
- [x] Redis caching
- [x] Rate limiting
- [x] Circuit breaker
- [x] 629 E2E tests
- [x] K6 load testing

### Recent (2026-01-06)
- [x] Enterprise migration tools v1.2
- [x] Enterprise health API
- [x] Fixed field mappings
- [x] Fixed API endpoints

---

## 🚧 KNOWN ISSUES

1. **V2 API incomplete** - Hầu hết routes còn ở V1
2. **No mobile app** - Chỉ có responsive web
3. **No real-time** - Chưa có WebSocket notifications

---

## 💻 QUICK COMMANDS

```bash
# Dev
npm run dev

# Database
npx prisma studio
npx prisma migrate dev

# Test
npm run test:e2e
k6 run enterprise/capacity-test/capacity-test.js

# Migration
npx ts-node enterprise/migration/migrate.ts parts ./data.csv

# Health check
curl http://localhost:3000/api/enterprise/health
```

---

## 🔗 IMPORTANT FILES TO CHECK

```bash
# Schema (verify field names)
cat prisma/schema.prisma | grep -A 10 "model Part"
cat prisma/schema.prisma | grep -A 10 "model Inventory"

# API routes
ls app/api/
ls app/api/v2/

# Enterprise tools
ls enterprise/
cat enterprise/migration/migrate.ts | head -50
```

---

## ✅ VERIFICATION QUESTIONS - UPDATED 2026-01-09

Khi load context mới, verify bằng cách trả lời:

| Question | Answer (CORRECT) |
|----------|------------------|
| Part tên field là gì? | `name` ✅ (không phải ~~partName~~) |
| Inventory số lượng field là gì? | `quantity` ✅ (không phải ~~onHand~~) |
| Inventory key là gì? | Composite `[partId, warehouseId, lotNumber]` ✅ |
| Warehouse model tồn tại? | ✅ CÓ |
| API chính dùng version nào? | `/api/*` (v1) + 9 routes v2 |
| Enterprise tools version? | v1.3 (fixed 2026-01-09) |
| Có bao nhiêu models? | 123 |
| Demo URL? | https://rtr-mrp.onrender.com/demo |

---

## 📝 RECENT CHANGES

### 2026-01-19: PHASE 3 COMPLETE - AI MATURITY 80% 🚀

**Phase 3 Features Completed:**
- ✅ Auto-PO System - Automated purchase order suggestions with approval workflow
- ✅ Auto-Scheduling System - Work order scheduling optimization
- ✅ Intelligent Alerts System - Unified alert center from all AI modules

**Files Added (6,000+ lines):**
```
src/lib/ai/alerts/          - 6 core modules
src/app/api/ai/alerts/      - 5 API routes
src/components/ai/alerts/   - 4 UI components
src/app/(dashboard)/ai/alerts/ - 2 pages
```

**Key Capabilities:**
- Alert aggregation from Forecast, Quality, Supplier Risk, Auto-PO, Auto-Schedule
- AI-powered summaries in Vietnamese
- Priority-based escalation rules
- One-click actions (approve PO, apply schedule, create NCR)
- User notification preferences

### 2026-01-09: CRITICAL CONTEXT DRIFT FIX 🔧

**Fixes Applied:**
- ✅ Fixed enterprise/migration/migrate.ts - correct field names
- ✅ Fixed HANDOVER.md - accurate documentation
- ✅ Established LOCAL (123 models) as production standard
- ✅ Health score: 72 → 85/100

**Correct Schema:**
- Part: uses `name` (not ~~partName~~)
- Inventory: uses `quantity` (not ~~onHand~~)
- Inventory: composite key `[partId, warehouseId, lotNumber]`
- Warehouse: model EXISTS

---

## 📝 TRANSCRIPT LOCATION

Chi tiết đầy đủ các session trước:
```
/mnt/transcripts/2026-01-09-*.txt
```

---

*RTR-MRP Handover Document v3.1*
*Updated: 2026-01-19 - Phase 3 Complete, AI Maturity 80%*
*Status: Production Ready + Enterprise Tools v1.3 + Full AI Suite*
