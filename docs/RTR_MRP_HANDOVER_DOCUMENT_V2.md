# ═══════════════════════════════════════════════════════════════════════════════
#
#                    RTR-MRP PROJECT HANDOVER DOCUMENT
#                    BẢN CHUYỂN GIAO DỰ ÁN CHI TIẾT
#
#                    Version: 2.0 (Updated)
#                    Date: 2026-01-13
#                    Author: Claude AI (Anthropic) - Technical Advisor
#                    
#                    ⚠️ UPDATED: Reflects latest codebase status
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# MỤC LỤC

1. [TỔNG QUAN DỰ ÁN](#1-tổng-quan-dự-án)
2. [KIẾN TRÚC HỆ THỐNG](#2-kiến-trúc-hệ-thống)
3. [CẤU TRÚC THƯ MỤC](#3-cấu-trúc-thư-mục)
4. [DATABASE SCHEMA](#4-database-schema)
5. [API ENDPOINTS](#5-api-endpoints)
6. [FEATURES ĐÃ HOÀN THÀNH](#6-features-đã-hoàn-thành)
7. [HƯỚNG DẪN SETUP](#7-hướng-dẫn-setup)
8. [HƯỚNG DẪN DEPLOYMENT](#8-hướng-dẫn-deployment)
9. [TESTING](#9-testing)
10. [KNOWN ISSUES & LIMITATIONS](#10-known-issues--limitations)
11. [CÔNG VIỆC CÒN LẠI](#11-công-việc-còn-lại)
12. [CREDENTIALS & ACCESS](#12-credentials--access)
13. [MATURITY ASSESSMENT](#13-maturity-assessment)
14. [CONTACTS & SUPPORT](#14-contacts--support)
15. [APPENDIX](#15-appendix)

---

# 1. TỔNG QUAN DỰ ÁN

## 1.1 Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **Tên dự án** | RTR-MRP (DAFC Unified Intelligent Platform) |
| **Loại** | Enterprise Manufacturing Resource Planning (MRP) |
| **Trạng thái** | Production-Ready |
| **Version** | 2.0 |
| **Repository** | [URL repository] |
| **Production URL** | https://rtr-mrp.onrender.com |
| **Ngôn ngữ UI** | Vietnamese (Primary), English (Planned) |

## 1.2 Technology Stack (UPDATED)

```yaml
Frontend:
  Framework: Next.js 15 (App Router)          # ⬆️ Updated from 14
  Language: TypeScript
  UI Library: React 19                         # ⬆️ Updated from 18
  Styling: Tailwind CSS
  Components: shadcn/ui
  State: React Context + Hooks
  Charts: Recharts
  Real-time: Socket.io                         # ⬆️ NEW - replaced polling

Backend:
  Runtime: Node.js 18+
  Framework: Next.js API Routes
  ORM: Prisma
  Database: PostgreSQL
  Auth: NextAuth.js
  File Storage: Local (upgradable to S3)

AI/ML:
  Providers: 
    - Google Gemini (Primary)                  # ⬆️ NEW
    - OpenAI GPT-4 (Secondary)
    - Anthropic Claude (Optional)
  Features: Summarization, Tagging, NCR Draft, Smart Search

DevOps:
  Hosting: Render.com
  CI/CD: GitHub Actions (recommended)
  Monitoring: (to be configured)

Testing:
  E2E: Playwright (347 tests)                  # ⬆️ Updated from 63
  Unit: Jest (to be expanded)
```

## 1.3 Quy mô dự án (UPDATED)

```
┌─────────────────────────────────────────────────────────────────┐
│                     PROJECT METRICS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Source Code (TypeScript/TSX):     ~173,000 LOC                │
│  Test Code:                        ~71,000 LOC                 │
│  E2E Tests:                        347 tests (PASSED)          │
│  API Endpoints:                    163+                        │
│  Database Tables:                  50+                         │
│  React Components:                 200+                        │
│  Modules:                          8 core + 4 contextual       │
│                                                                 │
│  Development Cost Estimate:        $240,000 - $300,000 USD     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 1.4 Lịch sử phát triển

| Phase | Tên | Timeline | Status | Mô tả |
|-------|-----|----------|--------|-------|
| 0 | Stabilize | 1 tuần | ✅ Done | Fix 5 customer bugs |
| 1 | Chat MVP | 2-3 tuần | ✅ Done | Contextual chat system |
| 2 | Screenshot | 2 tuần | ✅ Done | Smart screenshot capture |
| 3 | Trace Change | 3-4 tuần | ✅ Done | Audit log system |
| 4 | AI Integration | 4-6 tuần | ✅ Done | AI assistance features |
| Bonus | Testing & Perf | 1-2 tuần | ✅ Done | 347 E2E tests, Socket.io, Performance |

## 1.5 Maturity Level vs SAP/Oracle

```
┌─────────────────────────────────────────────────────────────────┐
│                    MATURITY COMPARISON                          │
├─────────────────────────────────────────────────────────────────┤
│ Feature              │ RTR-MRP │ SAP/Oracle │ Assessment       │
├──────────────────────┼─────────┼────────────┼──────────────────┤
│ Core MRP             │   80%   │    100%    │ Gap: APS, Multi  │
│ Financial Integration│   20%   │    100%    │ Gap: GL, AP/AR   │
│ Supply Chain         │   40%   │    90%     │ Gap: SCM         │
│ Analytics/BI         │   30%   │    85%     │ Gap: Embedded BI │
│ AI/ML Capabilities   │   15%   │    40%     │ OPPORTUNITY!     │
│ User Experience      │   90%   │    50%     │ ✅ ADVANTAGE     │
│ Cloud Native         │   95%   │    60%     │ ✅ ADVANTAGE     │
└─────────────────────────────────────────────────────────────────┘

Key Insight: RTR-MRP không cạnh tranh trực tiếp với SAP/Oracle về độ sâu
chức năng, mà chiến thắng bằng UX và AI Native.
```

---

# 2. KIẾN TRÚC HỆ THỐNG

## 2.1 High-Level Architecture (UPDATED)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Browser   │  │  Mobile App │  │  Customer   │  │   3rd Party │        │
│  │  (Next.js)  │  │  (Future)   │  │   Portal    │  │   Integrations      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          └────────────────┴───────┬────────┴────────────────┘
                                   │
                          ┌────────┴────────┐
                          │   Socket.io     │  ← NEW: Real-time
                          │   WebSocket     │
                          └────────┬────────┘
                                   │
┌──────────────────────────────────┼──────────────────────────────────────────┐
│                              API LAYER                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Next.js API Routes (/api/v2/...)                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │  │   Auth   │  │   CRUD   │  │    AI    │  │  Upload  │            │   │
│  │  │ Endpoints│  │ Endpoints│  │ Endpoints│  │ Endpoints│            │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVICE LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  MRP Engine  │  │  AI Service  │  │ Audit Logger │  │  Screenshot  │    │
│  │  (src/lib/   │  │  (Gemini/    │  │  (src/lib/   │  │  (src/lib/   │    │
│  │   mrp/)      │  │   OpenAI)    │  │   audit/)    │  │   screenshot)│    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             DATA LAYER                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Prisma ORM                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      PostgreSQL Database                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Module Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CORE MODULES                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   PARTS     │  │    BOM      │  │  INVENTORY  │  │  SUPPLIERS  │        │
│  │  Management │  │  Management │  │  Management │  │  Management │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   WORK      │  │  PURCHASE   │  │   SALES     │  │   QUALITY   │        │
│  │   ORDERS    │  │   ORDERS    │  │   ORDERS    │  │   CONTROL   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                         MRP ENGINE (src/lib/mrp/)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Pegging   │  │  Capacity   │  │ Simulation  │  │   Demand    │        │
│  │   Engine    │  │ Calculator  │  │   Engine    │  │  Forecasting│        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                    CONTEXTUAL FEATURES (Phase 0-4)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   CHAT      │  │ SCREENSHOT  │  │   AUDIT     │  │     AI      │        │
│  │   System    │  │   Capture   │  │   Trail     │  │  Assistant  │        │
│  │  (Socket.io)│  │             │  │             │  │(Gemini/GPT) │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 3. CẤU TRÚC THƯ MỤC

## 3.1 Root Directory Structure

```
rtr-mrp/
├── .env                          # Environment variables (DO NOT COMMIT)
├── .env.example                  # Example environment variables
├── .eslintrc.json               # ESLint configuration
├── .gitignore                   # Git ignore rules
├── next.config.js               # Next.js 15 configuration
├── package.json                 # Dependencies & scripts
├── package-lock.json            # Locked dependencies
├── postcss.config.js            # PostCSS configuration
├── tailwind.config.ts           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
├── prisma/                      # Database schema & migrations
│   ├── schema.prisma            # ⭐ MAIN DATABASE SCHEMA
│   └── migrations/              # Database migrations
├── public/                      # Static assets
├── src/                         # ⭐ SOURCE CODE
│   ├── app/                     # Next.js App Router pages
│   ├── components/              # React 19 components
│   ├── contexts/                # React contexts
│   ├── hooks/                   # Custom hooks
│   ├── lib/                     # Core libraries & services
│   ├── types/                   # TypeScript types
│   └── utils/                   # Utility functions
├── __tests__/                   # Test files (347 E2E tests)
│   ├── e2e/                     # E2E tests (Playwright)
│   └── unit/                    # Unit tests (Jest)
├── screenshots/                 # Screenshot storage (runtime)
└── docs/                        # Documentation
```

## 3.2 Key Directories

### `/src/app/` - Next.js 15 App Router

```
src/app/
├── (auth)/                      # Auth pages (login, register)
├── (dashboard)/                 # Main dashboard
│   ├── home/                    # Dashboard home
│   ├── bom/                     # BOM module
│   ├── parts/                   # Parts module
│   ├── suppliers/               # Suppliers module
│   ├── production/              # Work Orders
│   ├── purchasing/              # Purchase Orders
│   ├── orders/                  # Sales Orders
│   ├── mrp/                     # MRP module
│   ├── quality/                 # Quality module
│   └── inventory/               # Inventory module
├── api/                         # API Routes
│   ├── auth/                    # NextAuth
│   └── v2/                      # V2 API (main)
│       ├── conversations/       # Chat API
│       ├── screenshots/         # Screenshot API
│       ├── audit-logs/          # Audit API
│       └── ai/                  # AI API
└── globals.css
```

### `/src/lib/` - Core Services

```
src/lib/
├── prisma.ts                    # Prisma client
├── socket.ts                    # Socket.io setup (NEW)
├── auth/                        # Auth utilities
├── mrp/                         # ⭐ MRP ENGINE
│   ├── pegging-engine.ts
│   ├── capacity-calculator.ts
│   ├── simulation-engine.ts
│   └── index.ts
├── ai/                          # ⭐ AI SERVICE
│   ├── chat-ai-config.ts
│   ├── ai-service.ts
│   ├── gemini-provider.ts       # NEW: Gemini
│   ├── openai-provider.ts
│   └── chat-prompts/
├── audit/                       # Audit service
└── screenshot/                  # Screenshot service
```

---

# 4. DATABASE SCHEMA

## 4.1 Schema Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE DOMAINS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CORE DOMAIN:                                                               │
│  ├── User, Role, Permission                                                 │
│  ├── Part, Category, UnitOfMeasure                                         │
│  ├── BOM, BOMItem                                                          │
│  ├── Supplier, Customer                                                     │
│  ├── WorkOrder, WorkOrderItem                                              │
│  ├── PurchaseOrder, PurchaseOrderItem                                      │
│  ├── SalesOrder, SalesOrderItem                                            │
│  ├── Inventory, InventoryTransaction                                       │
│  └── QualityInspection, Lot                                                │
│                                                                             │
│  CONVERSATION DOMAIN (Phase 1):                                             │
│  ├── ConversationThread                                                    │
│  ├── Message                                                               │
│  ├── ThreadParticipant                                                     │
│  └── Mention                                                               │
│                                                                             │
│  SCREENSHOT DOMAIN (Phase 2):                                               │
│  ├── Attachment                                                            │
│  └── ScreenshotMetadata                                                    │
│                                                                             │
│  AUDIT DOMAIN (Phase 3):                                                    │
│  ├── AuditLog                                                              │
│  └── AuditLogLink                                                          │
│                                                                             │
│  AI DOMAIN (Phase 4):                                                       │
│  ├── ThreadSummary                                                         │
│  ├── MessageAITag                                                          │
│  ├── ScreenshotAnalysis                                                    │
│  └── AIDraft                                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 4.2 Key Enums

```prisma
enum ContextType {
  BOM
  WORK_ORDER
  PART
  SUPPLIER
  CUSTOMER
  PURCHASE_ORDER
  SALES_ORDER
  MRP_RUN
  QC_REPORT
  LOT
  INVENTORY
  GENERAL
}

enum ThreadStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum ThreadPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  RESTORE
  APPROVE
  REJECT
  SUBMIT
  CANCEL
  COMPLETE
  STATUS_CHANGE
  BULK_UPDATE
}

enum MessageCategory {
  QUESTION
  ISSUE
  DECISION
  INFORMATION
  REQUEST
  APPROVAL
  FEEDBACK
  ACTION_ITEM
}

enum DraftType {
  NCR
  TASK
  ROOT_CAUSE
  CORRECTIVE_ACTION
  CHANGE_REQUEST
}
```

---

# 5. API ENDPOINTS

## 5.1 API Overview

| Category | Prefix | Endpoints | Description |
|----------|--------|-----------|-------------|
| Conversations | `/api/v2/conversations/` | 10+ | Chat system |
| Screenshots | `/api/v2/screenshots/` | 3 | Screenshot capture |
| Audit | `/api/v2/audit-logs/` | 5 | Audit trail |
| AI | `/api/v2/ai/` | 6 | AI features |
| Core | Various | 140+ | MRP functions |
| **TOTAL** | | **163+** | |

## 5.2 Real-time Events (Socket.io) - NEW

```typescript
// Client → Server
socket.emit('join:thread', { threadId });
socket.emit('leave:thread', { threadId });
socket.emit('message:send', { threadId, content, mentions });
socket.emit('typing:start', { threadId });
socket.emit('typing:stop', { threadId });

// Server → Client
socket.on('message:new', (message) => { });
socket.on('message:updated', (message) => { });
socket.on('thread:updated', (thread) => { });
socket.on('typing:indicator', ({ userId, isTyping }) => { });
socket.on('participant:joined', (participant) => { });
```

---

# 6. FEATURES ĐÃ HOÀN THÀNH

## 6.1 Feature Matrix (UPDATED)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FEATURE STATUS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CORE MRP FEATURES:                                                         │
│  ├── Parts Management                    ✅ Complete                        │
│  ├── BOM Management                      ✅ Complete                        │
│  ├── Inventory Management                ✅ Complete                        │
│  ├── Supplier Management                 ✅ Complete                        │
│  ├── Customer Management                 ✅ Complete                        │
│  ├── Work Order Management               ✅ Complete                        │
│  ├── Purchase Order Management           ✅ Complete                        │
│  ├── Sales Order Management              ✅ Complete                        │
│  ├── MRP Engine                          ✅ Complete                        │
│  ├── Quality Control                     ✅ Complete                        │
│  └── Reporting                           ✅ Complete                        │
│                                                                             │
│  CONTEXTUAL CHAT (Phase 1):                                                │
│  ├── Context-first threads               ✅ Complete (8 modules)           │
│  ├── @mention users & roles              ✅ Complete                        │
│  ├── Real-time messaging (Socket.io)     ✅ Complete (UPGRADED)            │
│  ├── Typing indicators                   ✅ Complete (NEW)                 │
│  ├── Thread status & priority            ✅ Complete                        │
│  └── Discussions tab                     ✅ Complete (8 modules)           │
│                                                                             │
│  SCREENSHOT (Phase 2):                                                      │
│  ├── 1-click capture                     ✅ Complete                        │
│  ├── macOS-style frame                   ✅ Complete                        │
│  ├── Auto-collect metadata               ✅ Complete                        │
│  ├── Global floating button              ✅ Complete                        │
│  └── Keyboard shortcut (Ctrl+Shift+S)    ✅ Complete                        │
│                                                                             │
│  AUDIT TRAIL (Phase 3):                                                     │
│  ├── AuditLog với field changes          ✅ Complete                        │
│  ├── Bi-directional linking              ✅ Complete                        │
│  ├── Timeline view                       ✅ Complete                        │
│  └── History tab (8 modules)             ✅ Complete                        │
│                                                                             │
│  AI INTEGRATION (Phase 4):                                                  │
│  ├── Thread summarization                ✅ Complete                        │
│  ├── Message auto-tagging                ✅ Complete                        │
│  ├── NCR draft generation                ✅ Complete                        │
│  ├── Gemini integration                  ✅ Complete (NEW)                 │
│  └── Safety measures                     ✅ Complete                        │
│                                                                             │
│  TESTING & PERFORMANCE:                                                     │
│  ├── E2E Tests                           ✅ 347 tests passed               │
│  ├── Vietnamese UI selectors             ✅ Complete                        │
│  ├── React.memo optimization             ✅ Complete                        │
│  ├── Lazy loading (AI, html2canvas)      ✅ Complete (-2.15MB)             │
│  └── Context Provider optimization       ✅ Complete                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 6.2 Module Coverage

| Module | Route | Chat | Screenshot | History | AI |
|--------|-------|------|------------|---------|-----|
| Work Orders | `/production/[id]` | ✅ | ✅ | ✅ | ✅ |
| Parts | `/parts/[id]` | ✅ | ✅ | ✅ | ✅ |
| BOM | `/bom/[id]` | ✅ | ✅ | ✅ | ✅ |
| Suppliers | `/suppliers/[id]` | ✅ | ✅ | ✅ | ✅ |
| Purchase Orders | `/purchasing/[id]` | ✅ | ✅ | ✅ | ✅ |
| Sales Orders | `/orders/[id]` | ✅ | ✅ | ✅ | ✅ |
| MRP Runs | `/mrp/[runId]` | ✅ | ✅ | ✅ | ✅ |
| Quality | `/quality/traceability/[lotNumber]` | ✅ | ✅ | ✅ | ✅ |

**8/8 MODULES = 100% COVERAGE**

---

# 7. HƯỚNG DẪN SETUP

## 7.1 Prerequisites

```bash
# Required software
- Node.js 18.x or higher (recommend 20.x for Next.js 15)
- npm 9.x or higher
- PostgreSQL 14.x or higher
- Git

# Optional
- Docker & Docker Compose
- VS Code with Prisma, ESLint, Tailwind extensions
```

## 7.2 Installation Steps

```bash
# 1. Clone repository
git clone [repository-url] rtr-mrp
cd rtr-mrp

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env (see section 7.3)

# 4. Setup database
npx prisma migrate dev
npx prisma generate

# 5. Start development
npm run dev

# 6. Open http://localhost:3000
```

## 7.3 Environment Variables (UPDATED)

```bash
# .env file

# ═══════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════
DATABASE_URL="postgresql://user:password@localhost:5432/rtr_mrp"

# ═══════════════════════════════════════════════════════════════
# AUTHENTICATION
# ═══════════════════════════════════════════════════════════════
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# ═══════════════════════════════════════════════════════════════
# AI CONFIGURATION (UPDATED)
# ═══════════════════════════════════════════════════════════════
AI_PROVIDER="gemini"                     # "gemini" | "openai" | "anthropic"

# Google Gemini (Primary)
GOOGLE_AI_API_KEY="your-gemini-api-key"

# OpenAI (Secondary)
OPENAI_API_KEY="sk-..."

# Anthropic (Optional)
ANTHROPIC_API_KEY="sk-ant-..."

# ═══════════════════════════════════════════════════════════════
# SOCKET.IO (NEW)
# ═══════════════════════════════════════════════════════════════
SOCKET_PORT=3001                         # WebSocket port

# ═══════════════════════════════════════════════════════════════
# APPLICATION
# ═══════════════════════════════════════════════════════════════
NODE_ENV="development"
APP_URL="http://localhost:3000"
```

---

# 8. HƯỚNG DẪN DEPLOYMENT

## 8.1 Production Checklist

```
□ Pre-deployment:
  □ All 347 E2E tests passing
  □ TypeScript check passing
  □ Build successful
  □ Environment variables configured
  □ Database migrations applied

□ Security:
  □ NEXTAUTH_SECRET is strong
  □ API keys secured
  □ CORS configured
  □ Rate limiting configured

□ Performance:
  □ Lazy loading enabled
  □ React.memo applied to large components
  □ Static assets optimized
```

## 8.2 Render.com Deployment (Current)

```yaml
# render.yaml
services:
  - type: web
    name: rtr-mrp
    env: node
    buildCommand: npm install && npx prisma generate && npm run build
    startCommand: npm start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: rtr-mrp-db
          property: connectionString
      - key: NODE_ENV
        value: production
```

---

# 9. TESTING (UPDATED)

## 9.1 Test Statistics

```
┌─────────────────────────────────────────────────────────────────┐
│                     TEST COVERAGE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  E2E Tests (Playwright):           347 tests ✅ PASSED         │
│  ├── ui-acceptance.e2e.ts          26 tests                    │
│  ├── customer-portal.e2e.ts        37 tests                    │
│  └── [other test files]            284 tests                   │
│                                                                 │
│  Unit Tests (Jest):                ~20% coverage               │
│                                                                 │
│  Test/Source Ratio:                ~40% (Gold Standard)        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 9.2 Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with Playwright UI
npx playwright test --ui

# Run specific file
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test __tests__/e2e/ui-acceptance.e2e.ts

# Run unit tests
npm run test:unit
```

## 9.3 Vietnamese UI Selectors

```typescript
// Key Vietnamese selectors used in tests
button:has-text("Thêm")       // Add
button:has-text("Tạo")        // Create
button:has-text("Lưu")        // Save
button:has-text("Đăng xuất")  // Logout
button:has-text("Lệnh SX")    // Work Order
button:has-text("Tạo BOM")    // Create BOM
```

---

# 10. KNOWN ISSUES & LIMITATIONS

## 10.1 Known Issues

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| #001 | ~~Low~~ | ~~Chat polling 30s~~ | ✅ FIXED (Socket.io) |
| #002 | Low | Screenshot slow on complex pages | Workaround: Loading indicator |
| #003 | Medium | AI summary inaccurate for specialized terms | Disclaimer shown |
| #004 | Low | Recharts not lazy loaded | Deferred |

## 10.2 Technical Debt

| Area | Issue | Priority |
|------|-------|----------|
| Testing | Unit test coverage low (~20%) | High |
| Documentation | API docs not generated (Swagger) | High |
| Error handling | Some API errors not user-friendly | Medium |
| Mobile | Not optimized for mobile | Low |

## 10.3 Limitations

```
1. SCALABILITY:
   - Chưa test với 1000+ concurrent users
   - Chưa test với millions of records
   - Single-tenant architecture

2. AI:
   - Requires external API (Gemini/OpenAI)
   - Token costs can add up

3. FINANCIAL:
   - Core MRP: 80%, Financial: 20%
   - Missing: GL, AP/AR, Costing
```

---

# 11. CÔNG VIỆC CÒN LẠI

## 11.1 Immediate (Next 30 Days)

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| P0 | AI Chatbot for inventory queries | 2 weeks | High visibility |
| P0 | Smart Search (semantic) | 1 week | Immediate productivity |
| P1 | PO/Invoice OCR processing | 2 weeks | Reduce data entry 50% |
| P1 | AI-suggested reorder alerts | 1 week | Prevent stockouts |

## 11.2 Short-term (1-3 months)

```
□ Unit Test Coverage → 60%
□ API Documentation (Swagger)
□ Export thread as PDF
□ Mobile optimization
□ Multi-language (English)
```

## 11.3 Long-term (See Roadmap Document)

```
Phase 2 (Q2-Q3): Predictive Intelligence
- Demand Forecasting
- Quality Prediction
- Supplier Risk Intelligence

Phase 3 (Q3-Q4): Autonomous Operations
- Self-optimizing Inventory
- AI Production Scheduler (APS competitor)
```

---

# 12. CREDENTIALS & ACCESS

## 12.1 Access Checklist

```
□ Source Code Repository (read/write)
□ Production Environment (Render.com)
□ Database access
□ AI API keys:
  □ Google Gemini API key
  □ OpenAI API key (optional)
  □ Anthropic API key (optional)
□ Documentation access
```

## 12.2 Security Notes

```
⚠️ Chuyển credentials qua kênh an toàn
⚠️ Đổi NEXTAUTH_SECRET sau khi nhận
⚠️ Rotate API keys định kỳ
```

---

# 13. MATURITY ASSESSMENT

## 13.1 Current State vs Target

```
┌─────────────────────────────────────────────────────────────────┐
│                    MATURITY ROADMAP                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1 (Now)     Phase 2 (6mo)    Phase 3 (12mo)   Phase 4   │
│  ──────────────    ─────────────    ──────────────   ───────   │
│  Transactional  →  Assisted     →   Predictive   →  Autonomous │
│  System            Intelligence     Intelligence     Intelligence│
│                                                                 │
│  Current:          Target:          Target:          Target:    │
│  • AI Chat Bot     • Demand         • Self-healing   • Auto-    │
│  • Smart Search      Forecast       • Auto-reorder     optimize │
│  • Doc Processing  • Anomaly        • AI Scheduler              │
│                      Detection                                  │
│                    • Risk Predict                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 13.2 Competitive Position

```
Target: "AI-Native MRP" cho SMB Manufacturing Việt Nam

Không cạnh tranh trực tiếp với SAP/Oracle về độ sâu,
mà chiến thắng bằng:
• UX vượt trội (90% vs 50%)
• AI Native (không phải add-on)
• Implementation nhanh (2-4 weeks vs 6-18 months)
• Chi phí phải chăng
```

---

# 14. CONTACTS & SUPPORT

## 14.1 Project Stakeholders

| Role | Name | Contact | Notes |
|------|------|---------|-------|
| Product Owner | [Name] | [Email] | Business decisions |
| Technical Lead | [Name] | [Email] | Technical guidance |
| Previous Dev | [Name] | [Email] | Available for questions |

## 14.2 Escalation Path

```
Level 1: Code & Documentation
Level 2: Contact Previous Dev
Level 3: Contact Technical Lead
Level 4: Contact Product Owner
```

---

# 15. APPENDIX

## 15.1 Related Documents

| Document | Description |
|----------|-------------|
| RTR_MRP_CHAT_MVP_PHASE1.md | Chat system design |
| RTR_MRP_SCREENSHOT_*.md | Screenshot implementation |
| RTR_MRP_TRACE_CHANGE_PHASE3.md | Audit system |
| RTR_MRP_AI_INTEGRATION_PHASE4.md | AI features |
| RTR_MRP_ROADMAP_AI_FIRST.md | AI-First Strategy (NEW) |
| RTR_MRP_CROSSCHECK_VALUATION_REPORT.md | Project valuation |

## 15.2 Glossary

| Term | Definition |
|------|------------|
| MRP | Manufacturing Resource Planning |
| BOM | Bill of Materials |
| NCR | Non-Conformance Report |
| APS | Advanced Planning & Scheduling |
| RAG | Retrieval-Augmented Generation |

## 15.3 Checklist for New Developer

```
NGÀY 1:
□ Clone repository
□ Setup local environment
□ Run application
□ Read handover document

TUẦN 1:
□ Understand architecture
□ Make small change
□ Run 347 E2E tests
□ Understand Socket.io integration

TUẦN 2:
□ Understand MRP Engine
□ Understand AI services (Gemini/OpenAI)
□ Understand Chat + Screenshot + Audit
□ Ready for feature development
```

---

# ═══════════════════════════════════════════════════════════════════════════════
#                              END OF HANDOVER DOCUMENT V2
# ═══════════════════════════════════════════════════════════════════════════════
