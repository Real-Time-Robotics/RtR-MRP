# RTR-MRP Project X-Ray Report

> **Generated:** 2026-04-23
> **Branch analyzed:** `main` + `feat/purchase-request-module`
> **Project:** RTR-MRP (Material Requirements Planning)

---

## 1. Executive Summary

RTR-MRP is a full-stack Manufacturing Intelligence / ERP system built with Next.js 15, serving the Vietnamese manufacturing market. The project has been in active development for **~3.5 months** (27/12/2025 - 14/04/2026) and has reached a **mature, production-deployed** state with 20+ functional modules covering the entire MRP lifecycle.

| Metric | Value |
|--------|-------|
| Total commits (main) | 356 |
| Total source code | ~483,000 lines |
| Development period | 27/12/2025 → 14/04/2026 |
| Contributors | 3 (nclamvn: 333, viethungle0503: 20, RTR Deploy: 3) |
| Current status | Production deployed, feature expansion phase |

---

## 2. Codebase Statistics

### 2.1 Scale Overview

| Category | Count |
|----------|-------|
| Prisma models (database tables) | 179 |
| Schema lines | 6,781 |
| Indexes & unique constraints | 459 |
| API route files | 361 |
| UI components (.tsx) | 426 |
| Custom React hooks | 62 |
| Test files | 279 |
| Library modules (src/lib/) | 92 |
| Component directories | 84 |
| Dashboard modules | 35 |
| API module groups | 67 |
| Dependencies | 90 production + 19 dev |

### 2.2 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript 5.x, Tailwind CSS, Shadcn/UI, Framer Motion |
| Backend | Next.js 15 App Router, API Routes |
| Database | PostgreSQL/SQLite via Prisma ORM (179 models) |
| Auth | RTR Auth Gateway (migrated from NextAuth) |
| AI | Claude (primary), OpenAI (fallback), Google Gemini, Vercel AI SDK |
| Cache | Redis (with in-memory fallback) |
| Deployment | Docker, GHCR, SSH-based deploy |
| i18n | Vietnamese + English (song ngữ) |

---

## 3. Module Inventory

### 3.1 Dashboard Modules (20 main modules)

| # | Module | Path | Status |
|---|--------|------|--------|
| 1 | Home / Dashboard | `/home` | ✅ Complete |
| 2 | Parts (Vật tư/Linh kiện) | `/parts` | ✅ Complete |
| 3 | BOM (Bill of Materials) | `/bom` | ✅ Complete |
| 4 | Inventory (Tồn kho) | `/inventory` | ✅ Complete |
| 5 | Warehouses (Kho) | `/warehouses` | ✅ Complete |
| 6 | Orders (Đơn hàng) | `/orders` | ✅ Complete |
| 7 | Sales (Bán hàng) | `/sales` | ✅ Complete |
| 8 | Purchasing (Mua hàng) | `/purchasing` | ✅ Complete |
| 9 | Production (Sản xuất) | `/production` | ✅ Complete |
| 10 | MRP (Hoạch định vật tư) | `/mrp` | ✅ Complete |
| 11 | Quality (NCR/CAPA) | `/quality` | ✅ Complete |
| 12 | Suppliers (Nhà cung cấp) | `/suppliers` | ✅ Complete |
| 13 | Customers (Khách hàng) | `/customers` | ✅ Complete |
| 14 | Finance (Tài chính) | `/finance` | ✅ Complete |
| 15 | Reports (Báo cáo) | `/reports` | ✅ Complete |
| 16 | AI Insights | `/ai-insights` | ✅ Complete |
| 17 | Analytics (Phân tích) | `/analytics` | ✅ Complete |
| 18 | Notifications (Thông báo) | `/notifications` | ✅ Complete |
| 19 | Settings (Cài đặt) | `/settings` | ✅ Complete |
| 20 | Import/Export/Excel | `/import`, `/data-setup` | ✅ Complete |

### 3.2 Supporting Modules

| Module | Description |
|--------|-------------|
| Activity | Activity logs & tracking |
| Alerts | System alerts |
| Approvals | Workflow approvals |
| Audit | Audit trail |
| Compliance | Regulatory compliance |
| Cost Optimization | Cost reduction tracking |
| Costing | Product costing |
| Data Migration | Data migration tools |
| Discussions | Team discussions/comments |
| Documents | Document management |
| Help | Help/documentation center |
| Profile | User profile management |

### 3.3 API Modules (67 groups)

Key API groups with multiple endpoints:

| API Group | Endpoints | Key Features |
|-----------|-----------|--------------|
| `/api/mrp/` | 17+ | MRP run, ATP/CTP, pegging, simulation, multi-site, shortages |
| `/api/quality/` | 25+ | NCR, CAPA, inspections, certificates, traceability, SPC |
| `/api/inventory/` | 10+ | CRUD, ABC classification, cycle count, expiry alerts, adjustments |
| `/api/purchasing/pr/` | 8 | Purchase Request CRUD, approve/reject/submit/revise, convert to PO |
| `/api/ai/` | Multiple | Quality prediction, copilot, recommendations, data fetching |
| `/api/sales-orders/` | Multiple | Sales order management, line items |
| `/api/finance/` | Multiple | GL accounts, journal entries, invoices |
| `/api/bom/` | Multiple | BOM management, import/export |

---

## 4. Database Architecture

### 4.1 Model Categories (179 total)

| Category | Models | Key Tables |
|----------|--------|------------|
| **Core Manufacturing** | ~25 | Part, BomHeader, BomLine, WorkOrder, WorkOrderOperation, Routing |
| **Inventory & Warehouse** | ~15 | Inventory, Warehouse, TransferOrder, PickList, LotTransaction |
| **Sales & Orders** | ~15 | SalesOrder, SalesOrderLine, Shipment, Customer, Quotation |
| **Purchasing** | ~15 | PurchaseOrder, PurchaseRequest, Supplier, GoodsReceiptNote |
| **Quality** | ~20 | NCR, CAPA, Inspection, InspectionPlan, CertificateOfConformance |
| **MRP & Planning** | ~15 | MrpRun, MrpSuggestion, PlannedOrder, DemandForecast, ATPRecord |
| **Finance** | ~10 | GLAccount, JournalEntry, PurchaseInvoice, SalesInvoice |
| **AI & Analytics** | ~10 | AiRecommendation, AiModelLog, AnalyticsDashboard, KPIDefinition |
| **Auth & Security** | ~15 | User, UserSession, MFADevice, PasswordPolicy, ITARAccessLog |
| **Workflow** | ~10 | WorkflowDefinition, WorkflowInstance, WorkflowApproval |
| **System** | ~20 | AuditLog, Notification, ImportJob, ExportJob, Backup |
| **Communication** | ~10 | ConversationThread, Message, Mention, Notification |
| **Other** | ~20 | Equipment, Employee, Shift, Site, Tenant, Currency |

### 4.2 Schema Stats
- **6,781 lines** of Prisma schema
- **459 indexes & unique constraints**
- Multi-tenant support via `Tenant` model
- Full audit trail with `AuditLog`, `AuditTrailEntry`, `ActivityLog`

---

## 5. Development Timeline

### Phase 1: Foundation (Dec 2025) — 20 commits
- Project initialization
- Base Next.js 15 setup
- Initial Prisma schema
- Docker configuration

### Phase 2: Core Build Sprint (Jan 2026) — 179 commits
- **Heaviest development month** (50% of all commits)
- Built majority of 20+ modules
- Parts, BOM, Inventory, Orders, Sales, Production
- MRP engine with ATP/CTP
- Quality management (NCR, CAPA, Inspections)
- AI integration (Gemini, OpenAI)
- Workflow engine
- Finance module

### Phase 3: Stabilization (Feb 2026) — 71 commits
- Feature completion and refinement
- Auth system (registration, role selector)
- AI copilot fixes
- Data setup and reset tools
- Mock data cleanup
- Security: CSP updates

### Phase 4: Production Deploy & Optimization (Mar 2026) — 86 commits
- **Performance optimization**: 37 files, 8 N+1 query fixes, Redis cache, server pagination
- CI/CD pipeline: Docker build, GHCR push, SSH-based deploy
- Production bug fixes (Docker OOM, health checks, DNS)
- i18n: Vietnamese diacritics (~100 UI strings)
- BOM import improvements
- Auth migration: NextAuth → RTR Auth Gateway

### Phase 5: Feature Expansion (Apr 2026) — 3 commits (ongoing)
- New branch: `feat/purchase-request-module`
- Purchase Request workflow (+3,136 lines)
- Draft → Submit → Approve/Reject → Convert to PO

---

## 6. Commit Analysis

| Type | Count | % |
|------|-------|---|
| Feature (`feat`) | 104 | 29% |
| Bug Fix (`fix`) | 199 | 56% |
| Perf/Chore/Refactor | 25 | 7% |
| Other (merge, docs) | 28 | 8% |
| **Total** | **356** | **100%** |

**Observation:** The high fix-to-feature ratio (1.9:1) is typical of a rapidly built system entering stabilization — features were shipped fast in Jan, then polished through Feb-Apr.

---

## 7. Current Work: Purchase Request Module

**Branch:** `feat/purchase-request-module` (3 commits ahead of main)

### Changes Summary
- **+3,136 lines** added across 25 files
- **545 lines** modified in Prisma schema

### New Database Models
| Model | Purpose |
|-------|---------|
| `PurchaseRequest` | Main PR entity with approval workflow |
| `PurchaseRequestLine` | Line items with part, quantity, pricing |
| `PRAttachment` | File attachments |
| `PRComment` | Discussion/comments |
| `PRHistory` | Audit trail for PR status changes |

### New API Endpoints (8)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/purchasing/pr` | GET, POST | List & create PRs |
| `/api/purchasing/pr/[id]` | GET, PUT, DELETE | CRUD single PR |
| `/api/purchasing/pr/[id]/submit` | POST | Submit for approval |
| `/api/purchasing/pr/[id]/approve` | POST | Approve PR |
| `/api/purchasing/pr/[id]/reject` | POST | Reject PR |
| `/api/purchasing/pr/[id]/revise` | POST | Revise rejected PR |
| `/api/purchasing/pr/convert` | POST | Convert PR → Purchase Order |
| `/api/purchasing/pr/track/[lineId]` | GET | Track line item status |

### New UI Components (3)
| Component | Lines | Features |
|-----------|-------|----------|
| `pr-list.tsx` | 265 | Filterable table, status badges, bulk actions |
| `pr-form.tsx` | 391 | Multi-line form, part selector, validation |
| `pr-detail.tsx` | 447 | Full detail view, approval actions, history timeline |

### Tests
- `pr-service.test.ts` — 66 lines (unit tests)
- `pr-service.integration.test.ts` — 228 lines (integration tests)

---

## 8. Architecture Highlights

### 8.1 Security
- RTR Auth Gateway (custom auth system)
- Rate limiting on public endpoints
- Zod validation for all inputs
- CSP headers configured
- ITAR access logging
- MFA support (MFADevice, MFAChallenge models)
- Password policies & history

### 8.2 AI Integration
- **Claude** (primary AI provider)
- **OpenAI** (fallback)
- **Google Gemini** (additional)
- AI-powered: quality prediction, copilot chat, recommendations, SPC analysis
- Vercel AI SDK for streaming

### 8.3 Performance Optimizations (Applied Mar 2026)
- 8 N+1 query fixes
- Redis caching layer
- Server-side pagination
- MAX_PAGE_SIZE controls
- Docker OOM fixes (Node.js heap: 4GB)

### 8.4 Deployment
- Docker containerized
- GHCR (GitHub Container Registry)
- SSH-based production deploy
- Health check endpoints
- Caddy reverse proxy compatible

---

## 9. Risk Assessment & Observations

| Area | Status | Notes |
|------|--------|-------|
| **Code volume** | ⚠️ High | 483K lines is substantial for 3.5 months — monitor technical debt |
| **Test coverage** | ✅ Good | 279 test files, but ratio to 361 API routes suggests some gaps |
| **Schema complexity** | ⚠️ High | 179 models is enterprise-grade — migration management is critical |
| **Dependency count** | ✅ Normal | 90 prod + 19 dev dependencies — manageable |
| **Commit velocity** | 📉 Declining | From 179/mo (Jan) → 3/mo (Apr) — expected stabilization curve |
| **Fix ratio** | ⚠️ Notable | 56% of commits are fixes — typical for rapid build, should decrease |
| **i18n** | ✅ Active | Vietnamese + English bilingual support |
| **Documentation** | ✅ Present | CLAUDE.md, architecture docs, API docs |

---

## 10. Recommendations

1. **Test coverage audit** — Ensure all 361 API routes have corresponding test coverage
2. **Schema migration strategy** — With 179 models, establish a clear migration versioning process
3. **Performance monitoring** — Post-optimization, set up APM dashboards for key routes
4. **Technical debt review** — The Jan 2026 sprint shipped fast; schedule a refactoring pass
5. **PR module completion** — Merge `feat/purchase-request-module` branch after review
6. **API documentation** — Consider auto-generating OpenAPI specs from route handlers

---

*Report generated by Claude Code on 2026-04-23. Data sourced from git history, codebase analysis, and Prisma schema inspection.*
