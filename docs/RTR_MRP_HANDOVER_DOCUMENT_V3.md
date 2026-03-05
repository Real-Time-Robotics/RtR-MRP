# ═══════════════════════════════════════════════════════════════════════════════
#
#                    RTR-MRP PROJECT HANDOVER DOCUMENT
#                    BẢN CHUYỂN GIAO DỰ ÁN CHI TIẾT
#
#                    Version: 3.0 (Comprehensive Update)
#                    Date: 2026-02-24
#                    Previous Version: V2 (2026-01-13)
#
#                    Status: PRODUCTION-READY
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# MỤC LỤC

1. [TỔNG QUAN DỰ ÁN](#1-tổng-quan-dự-án)
2. [KIẾN TRÚC HỆ THỐNG](#2-kiến-trúc-hệ-thống)
3. [TECHNOLOGY STACK](#3-technology-stack)
4. [CẤU TRÚC THƯ MỤC](#4-cấu-trúc-thư-mục)
5. [DATABASE SCHEMA](#5-database-schema)
6. [API ENDPOINTS](#6-api-endpoints)
7. [FRONTEND COMPONENTS](#7-frontend-components)
8. [CORE MODULES & FEATURES](#8-core-modules--features)
9. [AI/ML SERVICE](#9-aiml-service)
10. [AUTHENTICATION & SECURITY](#10-authentication--security)
11. [HƯỚNG DẪN SETUP](#11-hướng-dẫn-setup)
12. [DEPLOYMENT & DEVOPS](#12-deployment--devops)
13. [BACKUP & DISASTER RECOVERY](#13-backup--disaster-recovery)
14. [TESTING](#14-testing)
15. [MONITORING & OPERATIONS](#15-monitoring--operations)
16. [KNOWN ISSUES & TECHNICAL DEBT](#16-known-issues--technical-debt)
17. [CÔNG VIỆC CÒN LẠI & ROADMAP](#17-công-việc-còn-lại--roadmap)
18. [CREDENTIALS & ACCESS](#18-credentials--access)
19. [CONTACTS & SUPPORT](#19-contacts--support)
20. [APPENDIX](#20-appendix)

---

# 1. TỔNG QUAN DỰ ÁN

## 1.1 Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **Tên dự án** | RTR-MRP (DAFC Unified Intelligent Platform) |
| **Loại** | Enterprise Manufacturing Resource Planning (MRP) |
| **Mục tiêu** | AI-Native MRP cho SMB Manufacturing Việt Nam |
| **Trạng thái** | Production-Ready |
| **Version** | 3.0 |
| **Repository** | https://github.com/nclamvn/rtr-mrp |
| **Production URL** | https://rtr-mrp.onrender.com |
| **Ngôn ngữ UI** | Vietnamese (Primary), English (Planned) |

## 1.2 Quy mô dự án (UPDATED Feb 2026)

```
┌─────────────────────────────────────────────────────────────────┐
│                     PROJECT METRICS (V3)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Database Models:                150+                           │
│  API Route Files:                289                            │
│  API Categories:                 63+                            │
│  React Component Categories:     40+                            │
│  E2E Test Files:                 46                             │
│  Frontend Pages/Sections:        39+                            │
│  Library Modules (src/lib):      50+                            │
│  Prisma Schema:                  ~5,837 LOC                    │
│                                                                 │
│  Development Cost Estimate:      $300,000 - $400,000 USD       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 1.3 Lịch sử phát triển

| Phase | Tên | Status | Mô tả |
|-------|-----|--------|-------|
| 0 | Stabilize | Done | Fix customer bugs, UI stabilization |
| 1 | Chat MVP | Done | Contextual chat system (Socket.io) |
| 2 | Screenshot | Done | Smart screenshot capture |
| 3 | Trace Change | Done | Audit log system |
| 4 | AI Integration | Done | AI assistance (Gemini/OpenAI/Claude) |
| 5 | Quality Module | Done | NCR, CAPA, SPC, Inspections (13 pages) |
| 6 | Purchasing Module | Done | Full PO lifecycle |
| 7 | Enterprise Features | Done | Multi-tenancy, Compliance, Workflow |
| 8 | ML Service | Done | Python FastAPI microservice |
| 9 | Mobile/PWA | Done | Offline support, barcode scanning |
| 10 | Production Hardening | Done | Docker, Backup, Monitoring |

## 1.4 So sánh với SAP/Oracle

```
┌──────────────────────┬─────────┬────────────┬──────────────────┐
│ Feature              │ RTR-MRP │ SAP/Oracle │ Assessment       │
├──────────────────────┼─────────┼────────────┼──────────────────┤
│ Core MRP             │   85%   │    100%    │ Gap: APS nâng cao│
│ Financial Integration│   40%   │    100%    │ Gap: Full GL     │
│ Supply Chain         │   60%   │    90%     │ Gap: SCM nâng cao│
│ Quality Management   │   75%   │    85%     │ Gần đạt          │
│ Analytics/BI         │   50%   │    85%     │ Gap: Embedded BI │
│ AI/ML Capabilities   │   45%   │    40%     │ ADVANTAGE!       │
│ User Experience      │   90%   │    50%     │ ADVANTAGE        │
│ Cloud Native         │   95%   │    60%     │ ADVANTAGE        │
│ Mobile/PWA           │   80%   │    40%     │ ADVANTAGE        │
│ Compliance (NDAA)    │   70%   │    80%     │ Gap: Full audit  │
└──────────────────────┴─────────┴────────────┴──────────────────┘
```

---

# 2. KIẾN TRÚC HỆ THỐNG

## 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   Browser   │  │  PWA App    │  │  Mobile     │  │   3rd Party │       │
│  │  (Next.js)  │  │  (Offline)  │  │  (Touch)    │  │  (Webhooks) │       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
└─────────┼────────────────┼────────────────┼────────────────┼───────────────┘
          └────────────────┴───────┬────────┴────────────────┘
                          HTTPS / WSS
                                   │
┌──────────────────────────────────┼────────────────────────────────────────┐
│                          NGINX REVERSE PROXY (Optional)                    │
│                          SSL Termination + Load Balancing                  │
└──────────────────────────────────┼────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼────────────────────────────────────────┐
│                         APPLICATION LAYER                                  │
│                                  │                                         │
│  ┌──────────────────────────────┴────────────────────────────────────┐   │
│  │                    NEXT.JS APPLICATION (Port 3000)                 │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │ React UI │  │API Routes│  │Socket.io │  │Middleware │          │   │
│  │  │Components│  │ (289)    │  │WebSocket │  │Auth+Rate  │          │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                  │                                        │
│  ┌──────────────────────────────┴────────────────────────────────────┐   │
│  │                      SERVICE LAYER                                 │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │MRP Engine│  │AI Service│  │Queue     │  │Workflow  │          │   │
│  │  │Pegging   │  │Gemini    │  │BullMQ    │  │Engine    │          │   │
│  │  │ATP/CTP   │  │OpenAI    │  │In-memory │  │Approvals │          │   │
│  │  │Simulation│  │Claude    │  │fallback  │  │          │          │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┼────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼────────────────────────────────────────┐
│                        ML SERVICE LAYER (Port 8000)                       │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                    FASTAPI PYTHON MICROSERVICE                     │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │Demand    │  │Lead Time │  │Anomaly   │  │Inventory │          │   │
│  │  │Forecast  │  │Prediction│  │Detection │  │Optimize  │          │   │
│  │  │Prophet   │  │Gradient  │  │Isolation │  │Safety    │          │   │
│  │  │ARIMA/ETS │  │Boosting  │  │Forest    │  │Stock/EOQ │          │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┼────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼────────────────────────────────────────┐
│                           DATA LAYER                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │  PostgreSQL 15  │  │    Redis 7      │  │   AWS S3        │          │
│  │  (Primary DB)   │  │  (Cache/Queue)  │  │  (File Storage) │          │
│  │  150+ models    │  │  256MB max      │  │  Presigned URLs │          │
│  │  Prisma ORM     │  │  LRU eviction   │  │  Documents      │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
└──────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Module Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CORE MANUFACTURING MODULES                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │  PARTS   │ │   BOM    │ │INVENTORY │ │SUPPLIERS │ │CUSTOMERS │         │
│  │PartPlng  │ │Multi-lvl │ │Multi-site│ │Risk Score│ │ Tiering  │         │
│  │PartCost  │ │Versioning│ │Lot/Serial│ │Lead Time │ │ Orders   │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│                                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │PRODUCTION│ │PURCHASING│ │  SALES   │ │ QUALITY  │ │ FINANCE  │         │
│  │Work Order│ │   PO     │ │   SO     │ │NCR/CAPA  │ │GL/Costing│         │
│  │Routing   │ │Invoicing │ │Shipments │ │SPC/Insp  │ │Invoices  │         │
│  │Capacity  │ │Payments  │ │Payments  │ │Alerts    │ │Currency  │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
├─────────────────────────────────────────────────────────────────────────────┤
│                           MRP ENGINE (src/lib/mrp/)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ Netting  │ │ Pegging  │ │ ATP/CTP  │ │Simulation│ │ Material │         │
│  │ LLC      │ │ Demand   │ │Available │ │ What-if  │ │Allocation│         │
│  │ Explosion│ │ Tracing  │ │ Promise  │ │ Analysis │ │ Issuance │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
├─────────────────────────────────────────────────────────────────────────────┤
│                      ENTERPRISE FEATURES                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │Workflow  │ │Compliance│ │ Mobile   │ │Analytics │ │ Import/  │         │
│  │Engine    │ │NDAA/ITAR │ │ PWA      │ │Dashboard │ │ Export   │         │
│  │Approvals │ │FDA CFR21 │ │ Barcode  │ │ KPI      │ │ Excel    │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
├─────────────────────────────────────────────────────────────────────────────┤
│                    COLLABORATION & AI FEATURES                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │Discussion│ │Screenshot│ │  Audit   │ │AI Copilot│ │   ML     │         │
│  │Socket.io │ │ Capture  │ │  Trail   │ │Gemini/GPT│ │Forecasts │         │
│  │@Mentions │ │ Metadata │ │ History  │ │ Claude   │ │Anomaly   │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 3. TECHNOLOGY STACK

## 3.1 Stack Overview

```yaml
Frontend:
  Framework: Next.js 14 (App Router)
  Language: TypeScript 5.x
  UI Library: React 18
  Styling: Tailwind CSS 3.4.1
  Components: Shadcn/UI + Radix UI
  State: Zustand + React Query (SWR)
  Forms: React Hook Form + Zod validation
  Charts: Recharts
  Icons: Lucide React
  Real-time: Socket.io Client
  Mobile: next-pwa (offline, service worker)
  Animation: Framer Motion

Backend:
  Runtime: Node.js 20 (Alpine Linux Docker)
  Framework: Next.js API Routes + Custom Express Server
  ORM: Prisma 5.22.0
  Database: PostgreSQL 15
  Cache: Redis 7 (with in-memory fallback)
  Queue: BullMQ (in-memory fallback)
  Auth: NextAuth.js v5 Beta
  File Storage: AWS S3 (presigned URLs)
  Email: Nodemailer / Resend / SendGrid / AWS SES
  Rate Limiting: Upstash Redis

AI/ML:
  ML Service: FastAPI (Python, port 8000)
  Forecasting: Prophet, ARIMA, ETS, Ensemble
  Lead Time: Gradient Boosting
  Anomaly: Isolation Forest
  Optimization: Safety Stock, EOQ, Reorder Point
  LLM Providers:
    Primary: Google Gemini
    Secondary: OpenAI GPT-4
    Tertiary: Anthropic Claude

DevOps:
  Containers: Docker multi-stage + Docker Compose
  Orchestration: Kubernetes ready
  Monitoring: Sentry (errors), Prometheus (metrics)
  CI/CD: GitHub Actions
  Load Testing: k6, Artillery
  E2E Testing: Playwright (46 test files)
  Unit Testing: Vitest
```

## 3.2 Key Dependencies

| Category | Packages |
|----------|----------|
| Core | `next`, `react`, `typescript`, `@prisma/client` |
| UI | `tailwindcss`, `@radix-ui/*`, `recharts`, `lucide-react` |
| State | `zustand`, `swr` |
| Forms | `react-hook-form`, `@hookform/resolvers`, `zod` |
| Auth | `next-auth`, `bcryptjs`, `otpauth` |
| AI | `@anthropic-ai/sdk`, `openai` (via API) |
| Storage | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |
| PDF/Excel | `jspdf`, `xlsx`, `pdfkit` |
| Real-time | `socket.io`, `socket.io-client` |
| PWA | `next-pwa`, `@zxing/library` (barcode) |
| Queue | `bullmq`, `ioredis` |

---

# 4. CẤU TRÚC THƯ MỤC

## 4.1 Root Directory

```
rtr-mrp/
├── src/                          # Main application source code
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # Auth pages (login, register)
│   │   ├── (dashboard)/         # Protected dashboard (39+ sections)
│   │   │   ├── home/            # Main dashboard
│   │   │   ├── parts/           # Parts management
│   │   │   ├── bom/             # BOM management
│   │   │   ├── inventory/       # Inventory management
│   │   │   ├── production/      # Work orders, routing, capacity
│   │   │   ├── purchasing/      # Purchase orders
│   │   │   ├── orders/          # Sales orders
│   │   │   ├── mrp/             # MRP planning
│   │   │   ├── quality/         # Quality (NCR, CAPA, SPC, etc.)
│   │   │   ├── suppliers/       # Supplier management
│   │   │   ├── customers/       # Customer management
│   │   │   ├── finance/         # Financial operations
│   │   │   ├── ai/              # AI insights & copilot
│   │   │   ├── reports/         # Reporting & analytics
│   │   │   ├── compliance/      # NDAA/ITAR compliance
│   │   │   ├── audit/           # Audit trails
│   │   │   ├── discussions/     # Team discussions
│   │   │   ├── settings/        # System configuration
│   │   │   └── ... (30+ more)   # Additional sections
│   │   └── api/                 # API Routes (289 files)
│   │       ├── auth/            # NextAuth endpoints
│   │       ├── parts/           # Parts API
│   │       ├── bom/             # BOM API
│   │       ├── production/      # Production API
│   │       ├── quality/         # Quality API
│   │       ├── inventory/       # Inventory API
│   │       ├── orders/          # Orders API
│   │       ├── mrp/             # MRP API
│   │       ├── finance/         # Finance API
│   │       ├── ai/              # AI/ML API
│   │       ├── ml/              # ML Service bridge
│   │       ├── admin/           # Admin API
│   │       ├── health/          # Health checks
│   │       ├── metrics/         # Prometheus metrics
│   │       ├── backup/          # Backup management
│   │       ├── import/          # Data import
│   │       ├── export/          # Data export
│   │       ├── cron/            # Scheduled jobs
│   │       ├── webhooks/        # External integrations
│   │       └── ...              # More API categories
│   ├── components/              # React components (40+ categories)
│   │   ├── ui/                  # Shadcn/UI base components
│   │   ├── layout/              # Header, sidebar, navigation
│   │   ├── forms/               # Reusable form components
│   │   ├── charts/              # Chart components
│   │   ├── mrp/                 # MRP-specific components
│   │   ├── production/          # Production components
│   │   ├── quality/             # Quality components
│   │   ├── inventory/           # Inventory components
│   │   ├── orders/              # Order components
│   │   ├── ai/                  # AI recommendation UI
│   │   ├── ai-copilot/          # Conversational AI interface
│   │   ├── discussions/         # Chat/discussion components
│   │   ├── workflow/            # Approval workflow UI
│   │   ├── mobile/              # Mobile-specific UI
│   │   ├── pwa/                 # PWA components
│   │   └── ...                  # More component categories
│   ├── lib/                     # Core libraries & services
│   │   ├── auth.ts              # Authentication system
│   │   ├── prisma.ts            # Prisma client
│   │   ├── socket.ts            # Socket.io setup
│   │   ├── mrp-engine/          # MRP calculation engine
│   │   ├── mrp/                 # MRP utilities
│   │   ├── ai/                  # AI integration
│   │   ├── spc/                 # SPC engine
│   │   ├── cache/               # Caching utilities
│   │   ├── security/            # Security utilities
│   │   ├── audit/               # Audit service
│   │   ├── screenshot/          # Screenshot service
│   │   ├── queue/               # Job queue (BullMQ)
│   │   ├── excel-handler.ts     # Excel import/export
│   │   └── ...                  # More library modules
│   ├── hooks/                   # Custom React hooks
│   ├── types/                   # TypeScript type definitions
│   └── utils/                   # Utility functions
├── prisma/                      # Database
│   ├── schema.prisma            # Schema definition (~5,837 LOC)
│   ├── seed.ts                  # Database seeder
│   └── migrations/              # Migration files
├── ml-service/                  # Python ML microservice
│   ├── main.py                  # FastAPI application
│   ├── requirements.txt         # Python dependencies
│   └── README.md                # ML service docs
├── docker/                      # Docker configuration
│   ├── Dockerfile               # Production multi-stage build
│   ├── Dockerfile.dev           # Development build
│   ├── docker-compose.yml       # Production orchestration
│   ├── docker-compose.dev.yml   # Dev orchestration
│   └── nginx/                   # Nginx config + SSL
├── e2e/                         # E2E tests (46 test files)
├── enterprise/                  # Enterprise features
├── scripts/                     # Utility scripts
│   ├── deploy/                  # deploy.sh, rollback.sh
│   ├── backup/                  # backup-db.sh, restore-db.sh
│   └── maintenance/             # clear-cache.sh, etc.
├── load-testing/                # Load testing configs
│   ├── k6/                      # k6 scripts
│   └── artillery/               # Artillery configs
├── docs/                        # Documentation (30+ files)
├── public/                      # Static assets, PWA manifest
├── server.ts                    # Custom server with WebSocket
├── package.json                 # Dependencies & scripts
├── tsconfig.json                # TypeScript config (strict)
├── tailwind.config.ts           # Tailwind CSS config
└── playwright.config.ts         # E2E test config
```

---

# 5. DATABASE SCHEMA

## 5.1 Domain Overview (150+ Models)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE DOMAINS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SUPPLY CHAIN & PLANNING:                                                   │
│  ├── Part, PartPlanning, PartCost, PartSpecs, PartCompliance               │
│  ├── PartSupplier, PartAlternate, PartDocument, PartRevision               │
│  ├── PartCertification                                                      │
│  ├── Supplier, SupplierRiskScore, LeadTimePrediction                       │
│  ├── BomHeader, BomLine (multi-level assembly)                             │
│  └── Customer (with tiering: Platinum > Gold > Silver > Bronze)            │
│                                                                             │
│  ORDERS & PROCUREMENT:                                                      │
│  ├── SalesOrder, SalesOrderLine, Shipment, ShipmentLine                    │
│  ├── PurchaseOrder, PurchaseOrderLine                                      │
│  ├── PurchaseInvoice, SalesInvoice, JournalEntry (GL)                     │
│  └── PurchasePayment, SalesPayment                                         │
│                                                                             │
│  MRP & PLANNING:                                                            │
│  ├── MrpRun, MrpSuggestion, MrpException                                  │
│  ├── DemandForecast, ATPRecord, PeggingRecord, PlannedOrder               │
│  ├── Simulation, SimulationResult                                          │
│  ├── Inventory, InventorySite, TransferOrder, PickList                     │
│  └── MaterialAllocation, LotTransaction                                     │
│                                                                             │
│  MANUFACTURING & PRODUCTION:                                                │
│  ├── WorkOrder, WorkOrderOperation, ProductionReceipt                      │
│  ├── WorkCenter, Routing, RoutingOperation, ScheduledOperation             │
│  ├── CapacityRecord, LaborEntry, DowntimeRecord                           │
│  ├── Equipment, MaintenanceSchedule, MaintenanceOrder                      │
│  └── Employee, Skill, EmployeeSkill, Shift, ShiftAssignment               │
│                                                                             │
│  QUALITY MANAGEMENT:                                                        │
│  ├── NCR, NCRHistory (Non-Conformance Reports)                             │
│  ├── CAPA, CAPAAction, CAPAHistory (Corrective/Preventive)                │
│  ├── InspectionPlan, InspectionCharacteristic, Inspection, Result          │
│  ├── DefectCode, CertificateOfConformance                                  │
│  └── QualityAlert (AI-generated)                                            │
│                                                                             │
│  FINANCE & COSTING:                                                         │
│  ├── GLAccount, CostType, PartCostComponent, PartCostRollup               │
│  ├── WorkOrderCost, CostVariance                                           │
│  └── Currency, ExchangeRate                                                 │
│                                                                             │
│  COMPLIANCE & SECURITY:                                                     │
│  ├── ITARControlledItem, ITARAccessLog (NDAA/ITAR)                         │
│  ├── ElectronicSignature, AuditTrailEntry (FDA CFR 21 Part 11)            │
│  ├── MFADevice, MFAChallenge (2FA/TOTP)                                   │
│  ├── UserSession, PasswordHistory, PasswordPolicy                          │
│  └── DataRetentionPolicy                                                    │
│                                                                             │
│  AI/ML & ANALYTICS:                                                         │
│  ├── AiRecommendation, AiModelLog                                          │
│  ├── DemandForecast (historical tracking)                                   │
│  ├── AnalyticsDashboard, DashboardWidget, KPIDefinition                    │
│  └── ReportSchedule, ReportInstance, DashboardTemplate                     │
│                                                                             │
│  WORKFLOWS & COLLABORATION:                                                 │
│  ├── WorkflowDefinition, WorkflowStep, WorkflowInstance                    │
│  ├── WorkflowApproval, WorkflowHistory                                     │
│  ├── ConversationThread, Message, ThreadParticipant, Mention               │
│  ├── NotificationSetting, Notification (Socket.io delivery)                │
│  └── AuditLog, ActivityLog                                                  │
│                                                                             │
│  SYSTEM & TENANT:                                                           │
│  ├── User, Tenant, TenantSubscription, TenantApiKey, TenantWebhook        │
│  ├── ImportJob, ImportRow, ImportSession, ImportMapping                     │
│  ├── ExportJob, ExcelTemplate                                               │
│  ├── Backup, BackupSchedule                                                 │
│  ├── SystemSetting, SyncSchedule, MigrationBatch                           │
│  └── SavedView, SavedReport                                                │
│                                                                             │
│  MOBILE & PWA:                                                              │
│  ├── MobileDevice, OfflineOperation                                        │
│  └── BarcodeDefinition, ScanLog, LabelTemplate                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 5.2 Key Enums

| Enum | Values |
|------|--------|
| ManufacturingStrategy | MTS, MTO, ATO |
| PickingStrategy | FIFO, FEFO, ANY |
| MakeOrBuy | MAKE, BUY, BOTH |
| ProcurementType | STOCK, ORDER, CONSIGNMENT |
| LifecycleStatus | DEVELOPMENT, PROTOTYPE, ACTIVE, PHASE_OUT, OBSOLETE, EOL |
| BomType | ENGINEERING, MANUFACTURING, CONFIGURABLE, PLANNING, SERVICE |
| ContextType | BOM, WORK_ORDER, PART, SUPPLIER, CUSTOMER, PO, SO, MRP_RUN, ... |
| ThreadStatus | OPEN, IN_PROGRESS, RESOLVED, CLOSED |
| AuditAction | CREATE, UPDATE, DELETE, APPROVE, REJECT, SUBMIT, ... |

## 5.3 Schema Location

- **File**: `prisma/schema.prisma` (~5,837 lines)
- **Migrations**: `prisma/migrations/`
- **Seed**: `prisma/seed.ts`

---

# 6. API ENDPOINTS

## 6.1 Overview: 289 Route Files across 63+ Categories

| Category | Prefix | Count | Description |
|----------|--------|-------|-------------|
| Parts | `/api/parts/` | 15+ | Part management, search, attributes |
| BOM | `/api/bom/` | 10+ | CRUD, versioning, validation |
| Production | `/api/production/` | 20+ | Work orders, operations, receipts |
| Quality | `/api/quality/` | 25+ | NCR, CAPA, inspections, SPC |
| Inventory | `/api/inventory/` | 15+ | Stock, transfers, receipts |
| Orders | `/api/orders/` | 15+ | Sales & purchase orders |
| MRP | `/api/mrp/` | 20+ | Runs, suggestions, ATP, pegging, simulation |
| Finance | `/api/finance/` | 15+ | GL, invoices, costing, payments |
| AI/ML | `/api/ai/`, `/api/ml/` | 10+ | Forecasting, copilot, recommendations |
| Reports | `/api/reports/` | 10+ | Dashboard, KPIs, scheduled reports |
| Admin | `/api/admin/` | 10+ | System config, user management |
| Auth | `/api/auth/` | 5+ | NextAuth, MFA, sessions |
| Import/Export | `/api/import/`, `/api/export/` | 10+ | Data import/export |
| Health | `/api/health/` | 3 | Liveness, readiness, full check |
| Metrics | `/api/metrics/` | 2 | Prometheus metrics |
| Backup | `/api/backup/` | 5+ | Backup management |
| Customers | `/api/customers/` | 8+ | Customer CRUD, tiering |
| Suppliers | `/api/suppliers/` | 8+ | Supplier CRUD, ratings |
| Webhooks | `/api/webhooks/` | 3+ | External integrations |
| Cron | `/api/cron/` | 3+ | Scheduled jobs |
| Mobile | `/api/mobile/` | 5+ | Mobile-optimized endpoints |
| Notifications | `/api/notifications/` | 5+ | Push notifications |

## 6.2 Health Check Endpoints

```bash
# Liveness check
HEAD /api/health              # Returns 200 if app is running

# Readiness check
OPTIONS /api/health           # Returns 200 if database connected

# Full health status
GET /api/health               # Returns detailed JSON health status

# ML service readiness
GET /api/health/ready         # Checks ML service connection
```

## 6.3 Real-time Events (Socket.io)

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

# 7. FRONTEND COMPONENTS

## 7.1 Component Categories (40+)

| Category | Path | Description |
|----------|------|-------------|
| **Base UI** | `components/ui/` | Shadcn/UI (Button, Card, Dialog, Table, ...) |
| **Layout** | `components/layout/` | Header, sidebar, navigation |
| **Forms** | `components/forms/` | Reusable form components |
| **Charts** | `components/charts/` | Chart wrappers & visualizations |
| **MRP** | `components/mrp/` | MRP calculation, ATP, pegging, simulation |
| **Production** | `components/production/` | Work orders, routing, capacity |
| **Quality** | `components/quality/` | NCR, CAPA, inspections |
| **Inventory** | `components/inventory/` | Stock levels, transfers, warehouse |
| **Orders** | `components/orders/` | Sales/purchase orders, shipments |
| **Parts** | `components/parts/` | Part management, BOMs, variants |
| **BOM** | `components/bom/` | BOM editor, multi-level views |
| **Finance** | `components/finance/` | GL, invoices, costing |
| **Suppliers** | `components/suppliers/` | Supplier management, ratings |
| **Customers** | `components/customers/` | Customer details, tiering |
| **AI** | `components/ai/` | AI recommendations, insights |
| **AI Copilot** | `components/ai-copilot/` | Conversational AI interface |
| **Discussions** | `components/discussions/` | Threaded conversations |
| **Analytics** | `components/analytics/` | Dashboard KPIs, trends |
| **Workflow** | `components/workflow/` | Approval workflows |
| **Documents** | `components/documents/` | Document management |
| **Audit** | `components/audit/` | Audit trail, compliance |
| **Mobile** | `components/mobile/` | Mobile-specific UI |
| **PWA** | `components/pwa/` | Offline indicators |
| **Notifications** | `components/notifications/` | Toast, alerts |
| **Import/Export** | `components/import/`, `components/export/` | Data I/O |
| **OEE** | `components/oee/` | Overall Equipment Effectiveness |

## 7.2 Dashboard Pages (39+ sections)

```
(dashboard)/
├── home/           # Main dashboard
├── ai/             # AI insights & copilot
├── mrp/            # MRP planning
├── production/     # Shop floor management
├── quality/        # Quality module (13 sub-pages)
│   ├── ncr         # Non-Conformance Reports
│   ├── capa        # Corrective Actions
│   ├── inspection-plans
│   ├── receiving
│   ├── in-process
│   ├── final
│   ├── certificates
│   ├── spc         # Statistical Process Control
│   ├── capability
│   ├── measurements
│   ├── traceability
│   └── alerts
├── inventory/      # Inventory management
├── orders/         # Sales orders
├── purchasing/     # Purchase orders
├── parts/          # Parts catalog
├── bom/            # BOM management
├── finance/        # Financial operations
├── reports/        # Reporting
├── suppliers/      # Supplier management
├── customers/      # Customer management
├── compliance/     # Compliance dashboard
├── audit/          # Audit trails
├── discussions/    # Team discussions
├── settings/       # Configuration
└── ... 15+ more sections
```

---

# 8. CORE MODULES & FEATURES

## 8.1 MRP Engine

**Location**: `src/lib/mrp-engine/`, `src/lib/mrp/`

| Feature | Description |
|---------|-------------|
| Netting | Gross-to-net requirement calculation |
| Low Level Coding (LLC) | Multi-level BOM explosion |
| ATP/CTP | Available-to-Promise + Capable-to-Promise |
| Pegging | Demand traceability (supply ↔ demand links) |
| Simulation | What-if analysis with scenario comparison |
| Exception Handling | Shortages, excess inventory detection |
| Material Allocation | Reserve materials to work orders |
| Planned Orders | Auto-generated order suggestions |

## 8.2 Quality Management

**Location**: `src/app/(dashboard)/quality/`, `components/quality/`

| Feature | Description |
|---------|-------------|
| NCR | Non-Conformance Reports with history tracking |
| CAPA | Corrective/Preventive Actions with workflow |
| Inspection Plans | AQL-based inspection specifications |
| Receiving Inspection | Incoming material quality checks |
| In-Process Inspection | Production line quality checks |
| Final Inspection | Finished goods quality verification |
| SPC | Statistical Process Control (X-bar, R, Cp/Cpk) |
| Certificates | COC/COA generation |
| Traceability | Lot/serial number tracking |
| Quality Alerts | AI-generated alerts |

## 8.3 Production Management

| Feature | Description |
|---------|-------------|
| Work Orders | Discrete & batch processing |
| Routing | Multi-operation routing with setup times |
| Capacity Planning | Work center capacity & bottleneck analysis |
| Labor Tracking | Time entry per operation |
| OEE | Overall Equipment Effectiveness calculation |
| Scheduling | Operation scheduling with resource allocation |
| Downtime | Downtime recording & analysis |
| Maintenance | Equipment maintenance scheduling |

## 8.4 Supply Chain

| Feature | Description |
|---------|-------------|
| Supplier Management | Rating (A-D), risk scoring |
| Purchase Orders | Full lifecycle (Draft → Approved → Received) |
| Lead Time Prediction | ML-based (Gradient Boosting) |
| Inventory Optimization | Safety stock, EOQ, reorder point |
| Transfer Orders | Multi-site inventory transfers |
| Lot Tracking | FIFO/FEFO picking strategies |
| Barcode | Scanning & label printing |

## 8.5 Finance

| Feature | Description |
|---------|-------------|
| GL Accounts | Chart of accounts |
| Cost Types | Standard, actual, variance tracking |
| Part Costing | Component cost rollup |
| Invoicing | Purchase & sales invoices |
| Payments | Payment tracking & reconciliation |
| Currency | Multi-currency with exchange rates |

## 8.6 Collaboration

| Feature | Description |
|---------|-------------|
| Discussions | Context-first threads (8 modules) |
| @Mentions | User/role mentions with notifications |
| Real-time | Socket.io WebSocket messaging |
| Typing Indicators | Live typing status |
| Screenshot | 1-click capture with metadata |
| Audit Trail | Immutable field-change logging |

## 8.7 Compliance

| Feature | Description |
|---------|-------------|
| NDAA/ITAR | Controlled item tracking, access logging |
| FDA CFR 21 Part 11 | Electronic signatures, audit trail |
| Data Retention | Configurable retention policies |
| ROHS/REACH | Part compliance tracking |

## 8.8 Workflow Engine

| Feature | Description |
|---------|-------------|
| Definitions | Configurable step-based workflows |
| Approvals | Multi-level approval gates |
| History | Complete workflow audit trail |
| Notifications | Automatic notifications on state changes |

---

# 9. AI/ML SERVICE

## 9.1 LLM Integration

**Providers** (configured via `AI_PROVIDER` env):

| Provider | Usage | Model |
|----------|-------|-------|
| Google Gemini | Primary | gemini-pro |
| OpenAI | Secondary | GPT-4 |
| Anthropic Claude | Tertiary | claude-3 |

**AI Features:**
- Thread summarization
- Message auto-tagging (QUESTION, ISSUE, DECISION, etc.)
- NCR draft generation from discussions
- Smart search (semantic)
- Email parser for order extraction
- Document OCR for invoice scanning
- Context-aware recommendations

## 9.2 ML Microservice (FastAPI)

**Location**: `ml-service/`
**Port**: 8000
**Bridge API**: `/api/ml/`

| Capability | Algorithm | Description |
|------------|-----------|-------------|
| Demand Forecasting | Prophet, ARIMA, ETS, Ensemble | Time series demand prediction |
| Lead Time Prediction | Gradient Boosting | Supplier delivery time estimation |
| Anomaly Detection | Isolation Forest | Quality/inventory anomaly alerts |
| Safety Stock | Standard, King's, Dynamic | Optimal safety stock calculation |
| EOQ | With quantity discounts | Economic Order Quantity |
| Reorder Point | Dynamic calculation | When to reorder |

**Vietnamese Calendar Support**: Holidays, Tet, seasonal patterns integrated.

---

# 10. AUTHENTICATION & SECURITY

## 10.1 Authentication (NextAuth.js v5)

| Feature | Implementation |
|---------|----------------|
| Login | Credentials (email + password) |
| 2FA/MFA | TOTP via `otpauth` package |
| Account Lockout | 5 failed attempts → 15-min lockdown |
| Password Policy | 12+ chars, mixed case, numbers, symbols |
| Password History | Last 5 passwords tracked (no reuse) |
| Password Expiry | 90-day max age |
| Session | JWT-based with secure HttpOnly cookies |
| SSO | Optional Supabase SSO support |

## 10.2 Security Measures

| Measure | Implementation |
|---------|----------------|
| Password Hashing | bcryptjs |
| Rate Limiting | Upstash Redis |
| CSRF | Next.js built-in |
| XSS Prevention | Input sanitization |
| ITAR Access Control | Access logging for controlled items |
| Electronic Signatures | FDA CFR 21 Part 11 compliance |
| Multi-tenancy | Tenant isolation at database level |

## 10.3 Key Files

- `src/lib/auth.ts` - Authentication logic
- `src/middleware.ts` - Auth + rate limiting middleware
- Password flow: Validate → Check lockout → bcrypt verify → TOTP check → Create session

---

# 11. HƯỚNG DẪN SETUP

## 11.1 Prerequisites

```
Required:
- Node.js 20.x (hoặc 18.x minimum)
- npm 9.x+
- PostgreSQL 15
- Git

Optional:
- Docker & Docker Compose
- Redis 7 (có in-memory fallback)
- Python 3.10+ (cho ML service)
- VS Code với extensions: Prisma, ESLint, Tailwind CSS
```

## 11.2 Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/nclamvn/rtr-mrp.git
cd rtr-mrp

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env (see section 11.3)

# 4. Setup database
npx prisma generate
npx prisma db push

# 5. Seed sample data (optional)
npx tsx prisma/seed.ts

# 6. Start development server
npm run dev          # Custom server with WebSocket (ts-node)
# OR
npm run dev:next     # Next.js dev server only

# 7. Open http://localhost:3000
```

## 11.3 Environment Variables

```bash
# ═══════════════════════════════════════════════════
# DATABASE (Required)
# ═══════════════════════════════════════════════════
DATABASE_URL="postgresql://user:password@localhost:5432/rtr_mrp"
POSTGRES_USER=rtr
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=rtr_mrp

# ═══════════════════════════════════════════════════
# AUTHENTICATION (Required)
# ═══════════════════════════════════════════════════
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"
AUTH_SECRET="<same as NEXTAUTH_SECRET>"

# ═══════════════════════════════════════════════════
# CACHE & QUEUE (Optional - has in-memory fallback)
# ═══════════════════════════════════════════════════
REDIS_URL="redis://localhost:6379"
ML_SERVICE_URL="http://localhost:8000"

# ═══════════════════════════════════════════════════
# AI PROVIDERS (Optional)
# ═══════════════════════════════════════════════════
AI_PROVIDER="gemini"                     # "gemini" | "openai" | "anthropic"
GOOGLE_AI_API_KEY="your-key"
GEMINI_API_KEY="your-key"
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."

# ═══════════════════════════════════════════════════
# AWS S3 (Optional - for file storage)
# ═══════════════════════════════════════════════════
AWS_ACCESS_KEY_ID="xxx"
AWS_SECRET_ACCESS_KEY="xxx"
AWS_S3_BUCKET="rtr-mrp-storage"
AWS_REGION="ap-southeast-1"

# ═══════════════════════════════════════════════════
# MONITORING (Optional)
# ═══════════════════════════════════════════════════
SENTRY_DSN="https://xxx@sentry.io/xxx"
LOG_LEVEL="info"

# ═══════════════════════════════════════════════════
# EMAIL (Optional)
# ═══════════════════════════════════════════════════
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="xxx"
SMTP_PASS="xxx"

# ═══════════════════════════════════════════════════
# APPLICATION
# ═══════════════════════════════════════════════════
NODE_ENV="development"
SKIP_RATE_LIMIT=false
BACKUP_RETENTION_DAYS=30
AI_ENABLED=true
```

## 11.4 NPM Scripts

```bash
# Development
npm run dev              # Custom server (ts-node) with WebSocket
npm run dev:next        # Next.js dev server

# Build & Production
npm run build            # Full production build (prisma + next + tsc)
npm start               # Production server (node dist/server.js)

# Database
npm run db:push         # Push schema changes
npm run db:seed         # Seed sample data
npm run db:reset        # Reset and reseed

# Testing
npm run test            # Unit tests (Vitest)
npm run test:coverage   # Coverage report
npm run test:e2e        # Playwright E2E tests
npm run test:e2e:ui     # E2E with Playwright UI
npm run test:e2e:mobile # Mobile-specific tests

# Load Testing
npm run load:smoke      # k6 smoke test
npm run load:test       # k6 standard test
npm run load:stress     # k6 stress test
npm run artillery:main  # Artillery main test

# Maintenance
npm run clean           # Clean build artifacts
npm run lint            # ESLint
```

---

# 12. DEPLOYMENT & DEVOPS

## 12.1 Docker Deployment (Recommended)

### Quick Start

```bash
# Clone and configure
git clone https://github.com/nclamvn/rtr-mrp.git
cd rtr-mrp
cp .env.example .env
# Edit .env with production credentials

# Start all services
cd docker
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Seed data (optional)
docker-compose exec app npx prisma db seed

# Verify
curl http://localhost:3000/api/health
```

### Docker Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| **app** | Node.js 20 Alpine | 3000 | Next.js application |
| **db** | PostgreSQL 15 | 5432 | Primary database |
| **redis** | Redis 7 | 6379 | Cache & queue |
| **ml-service** | Python FastAPI | 8000 | ML microservice |
| **nginx** | Nginx (optional) | 80/443 | Reverse proxy + SSL |

### SSL Setup

```bash
# Let's Encrypt
certbot certonly --standalone -d mrp.yourcompany.com
cp /etc/letsencrypt/live/mrp.yourcompany.com/fullchain.pem docker/nginx/ssl/
cp /etc/letsencrypt/live/mrp.yourcompany.com/privkey.pem docker/nginx/ssl/

# Start with nginx
docker-compose --profile with-nginx up -d
```

## 12.2 Render.com Deployment (Current Production)

```yaml
# Service config
Service Type: Web Service
Build Command: npm install && npx prisma generate && npm run build
Start Command: npm start
Auto-deploy: Enabled (main branch)
Database: Render PostgreSQL
```

## 12.3 Deployment Scripts

```bash
# Standard deployment
./scripts/deploy/deploy.sh
# Actions: pull code → backup → update containers → migrate → verify health

# Rollback
./scripts/deploy/rollback.sh
```

## 12.4 Scaling

| Method | Implementation |
|--------|----------------|
| Horizontal | Multiple app replicas via Docker Swarm or K8s |
| Database | Managed PostgreSQL (AWS RDS, Cloud SQL) |
| Connection Pool | PgBouncer for production |
| Read Replicas | For reporting queries |

---

# 13. BACKUP & DISASTER RECOVERY

## 13.1 Backup Strategy

| Type | Schedule | Retention | Format |
|------|----------|-----------|--------|
| Daily Backup | 2:00 AM UTC (GitHub Actions) | 30 days | `.dump` + `.sql.gz` |
| Pre-deploy | Before each deployment | Until next deploy | `.dump` |
| Manual | On demand | Configurable | `.dump` + `.sql.gz` |

## 13.2 Backup Commands

```bash
# Create backup
./scripts/backup/backup-db.sh                    # Auto-named
./scripts/backup/backup-db.sh my-backup-name     # Custom name

# List backups
ls -la backups/

# Verify backup integrity
gunzip -t backups/backup-YYYYMMDD.sql.gz

# Restore (interactive)
./scripts/backup/restore-db.sh backups/backup-YYYYMMDD.dump

# Manual restore from SQL
docker-compose stop app
gunzip -c backups/backup.sql.gz | docker-compose exec -T db psql -U rtr -d rtr_mrp
docker-compose start app
```

## 13.3 Disaster Recovery

| Metric | Target |
|--------|--------|
| **RTO** (Recovery Time) | < 1 hour (typical: 10-30 min) |
| **RPO** (Recovery Point) | 24 hours (daily backups) |
| **RPO** (with WAL) | Minutes |

**Recovery Steps:**
1. Assess failure → identify last good backup
2. Provision new environment (docker-compose up -d db redis)
3. Restore backup (./scripts/backup/restore-db.sh)
4. Start application (docker-compose up -d app)
5. Verify health (curl /api/health)

---

# 14. TESTING

## 14.1 Test Infrastructure

| Type | Tool | Config |
|------|------|--------|
| E2E | Playwright | `playwright.config.ts` (46 files) |
| Unit | Vitest | `vitest.config.ts` |
| Load | k6, Artillery | `load-testing/` |
| Mobile | Playwright (mobile projects) | `--project='Mobile Chrome'` |

## 14.2 Running Tests

```bash
# E2E Tests (all)
npm run test:e2e
SKIP_RATE_LIMIT=true npx playwright test --project=chromium

# E2E specific module
npm run test:e2e:auth
npm run test:e2e:parts
npm run test:e2e:bom
npm run test:e2e:production
npm run test:e2e:discussions
npm run test:e2e:perf

# With Playwright UI
npm run test:e2e:ui

# Desktop browsers
npm run test:e2e:desktop

# Mobile browsers
npm run test:e2e:mobile

# Unit tests
npm run test
npm run test:coverage

# Load tests
npm run load:smoke
npm run load:test
npm run load:stress
```

## 14.3 Test Results (Latest from V1)

| Module | Tests | Pass Rate |
|--------|-------|-----------|
| Auth | 13 | 100% |
| Parts | 9 | 100% |
| BOM | 10 | 100% |
| Inventory | 49 | 98% |
| Production | 34 | 53% |
| Quality | 87 | 100% |
| Purchasing | 33 | 100% |
| Orders | 22 | 95% |
| MRP | 22 | 91% |
| **Total** | **334+** | **87%+** |

## 14.4 Vietnamese UI Selectors

```typescript
// Common Vietnamese selectors used in tests
button:has-text("Thêm")       // Add
button:has-text("Tạo")        // Create
button:has-text("Lưu")        // Save
button:has-text("Đăng xuất")  // Logout
button:has-text("Lệnh SX")    // Work Order
button:has-text("Tạo BOM")    // Create BOM
```

---

# 15. MONITORING & OPERATIONS

## 15.1 Health Checks

```bash
# Quick health check
curl -s http://localhost:3000/api/health | jq

# Expected response
{
  "status": "healthy",
  "timestamp": "2026-02-24T10:30:00.000Z",
  "version": "1.0.0",
  "uptime": 120,
  "checks": {
    "database": { "status": "pass", "latency": 5 },
    "cache": { "status": "pass", "latency": 2 }
  }
}
```

## 15.2 Daily Operations

```bash
# View logs
docker-compose logs -f              # All services
docker-compose logs -f app          # App only
docker-compose logs --tail=100 app  # Last 100 lines

# Check resources
docker stats                        # Container stats
docker system df                    # Disk usage

# Restart services
docker-compose restart              # All
docker-compose restart app          # App only

# Clear cache
./scripts/maintenance/clear-cache.sh

# Database access
docker-compose exec db psql -U rtr -d rtr_mrp

# Redis access
docker-compose exec redis redis-cli
docker-compose exec redis redis-cli INFO memory
```

## 15.3 Troubleshooting

| Issue | Solution |
|-------|----------|
| App not starting | Check logs: `docker-compose logs app` |
| Database connection | Check: `docker-compose exec db pg_isready` |
| Rate limit errors | Set `SKIP_RATE_LIMIT=true` or restart |
| Auth issues | Verify `NEXTAUTH_SECRET` in .env |
| Build failures | Check Node.js version (20+) |
| WebSocket not connecting | Check `server.ts` is running |
| High memory | `docker stats --no-stream`, clear Redis: `FLUSHALL` |
| Slow queries | Check pg_stat_activity for long-running queries |

## 15.4 Monitoring Alerts

**Configure uptime monitoring for:**
- Endpoint: `https://mrp.yourcompany.com/api/health`
- Alert if: Response time > 5s, Status != 200, status != "healthy"

**Log monitoring for:**
- `[ERROR]` entries
- `status: 500` responses
- `Rate limit exceeded` messages

---

# 16. KNOWN ISSUES & TECHNICAL DEBT

## 16.1 Known Issues

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| #001 | Low | Screenshot slow on complex pages | Workaround: Loading indicator |
| #002 | Medium | AI summary inaccurate for specialized terms | Disclaimer shown |
| #003 | Low | Recharts not lazy loaded | Deferred |
| #004 | Medium | Production module E2E pass rate: 53% | Needs investigation |

## 16.2 Technical Debt

| Area | Issue | Priority |
|------|-------|----------|
| Testing | Unit test coverage low (~20%) | High |
| Documentation | API docs not auto-generated (Swagger) | High |
| Error handling | Some API errors not user-friendly | Medium |
| Monitoring | Sentry/Prometheus not fully configured | Medium |
| i18n | English translation not implemented | Medium |
| Performance | Some N+1 queries in reports | Low |

## 16.3 Architecture Limitations

```
1. SCALABILITY:
   - Chưa test với 1000+ concurrent users
   - Single-tenant mặc định (multi-tenant models sẵn sàng)

2. AI:
   - Requires external API keys (Gemini/OpenAI/Claude)
   - Token costs can accumulate
   - ML service requires Python runtime

3. FINANCIAL:
   - GL/AP/AR: 40% hoàn thành
   - Missing: Full general ledger, bank reconciliation

4. COMPLIANCE:
   - NDAA/ITAR: Framework có, chưa full audit
   - FDA: Electronic signatures implemented, chưa full validation
```

---

# 17. CÔNG VIỆC CÒN LẠI & ROADMAP

## 17.1 Immediate (Next 30 Days)

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| P0 | Fix Production E2E tests (53% → 90%+) | 1 week | Quality |
| P0 | Unit test coverage → 40% | 2 weeks | Quality |
| P1 | API documentation (Swagger/OpenAPI) | 1 week | DX |
| P1 | Sentry + Prometheus full setup | 3 days | Operations |

## 17.2 Short-term (1-3 months)

```
- English language support (i18n)
- Full Swagger/OpenAPI documentation
- Performance optimization (N+1 queries)
- Mobile UI polish
- Export thread as PDF
- Advanced reporting (embedded BI)
```

## 17.3 Long-term Roadmap (AI-First Strategy)

```
┌──────────────────────────────────────────────────────────────────┐
│                    AI-FIRST EVOLUTION ROADMAP                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Phase 1 (Now)     Phase 2 (6mo)    Phase 3 (12mo)   Phase 4    │
│  ──────────────    ─────────────    ──────────────   ───────     │
│  Transactional  →  Assisted     →   Predictive   →  Autonomous  │
│  System            Intelligence     Intelligence     Intelligence│
│                                                                   │
│  Current:          Target:          Target:          Target:     │
│  - AI Chat Bot     - Demand         - Self-healing   - Auto-     │
│  - Smart Search      Forecast       - Auto-reorder     optimize  │
│  - ML Service      - Anomaly        - AI Scheduler              │
│  - Forecasting       Detection                                   │
│  - Quality AI      - Risk Predict                                │
│                                                                   │
│  Strategy: "AI-Native MRP" cho SMB Manufacturing Việt Nam        │
│  - UX vượt trội (90% vs SAP 50%)                                │
│  - AI Native (không phải add-on)                                 │
│  - Triển khai nhanh (2-4 weeks vs 6-18 months)                  │
│  - Chi phí phải chăng                                            │
└──────────────────────────────────────────────────────────────────┘
```

---

# 18. CREDENTIALS & ACCESS

## 18.1 Access Checklist

```
□ Source Code Repository (GitHub - read/write)
□ Production Environment (Render.com dashboard)
□ Database access (PostgreSQL credentials)
□ Redis access (cache server)
□ AI API keys:
  □ Google Gemini API key
  □ OpenAI API key (optional)
  □ Anthropic API key (optional)
□ AWS credentials (S3 file storage)
□ Sentry access (error monitoring)
□ Email service credentials (SMTP/SendGrid/Resend)
□ Domain registrar access (SSL management)
□ Documentation access
```

## 18.2 Security Notes

```
QUAN TRỌNG:
- Chuyển credentials qua kênh an toàn (encrypted)
- Đổi NEXTAUTH_SECRET ngay sau khi nhận
- Rotate API keys định kỳ (mỗi 90 ngày)
- KHÔNG commit .env file vào repository
- Sử dụng environment variables trên platform (Render/Docker)
- Backup encryption keys separately
```

---

# 19. CONTACTS & SUPPORT

## 19.1 Project Stakeholders

| Role | Name | Contact | Notes |
|------|------|---------|-------|
| Product Owner | [Name] | [Email] | Business decisions |
| Technical Lead | [Name] | [Email] | Technical guidance |
| Previous Dev | RTR Team | support@rtr-mrp.com | Available for questions |
| QA | Antigravity | - | Testing partner |

## 19.2 Escalation Path

```
Level 1: Code & Documentation (this document + /docs folder)
Level 2: Contact Previous Dev
Level 3: Contact Technical Lead
Level 4: Contact Product Owner
```

---

# 20. APPENDIX

## 20.1 Related Documents

| Document | Path | Description |
|----------|------|-------------|
| Architecture | `docs/ARCHITECTURE.md` | System architecture details |
| Deployment | `docs/DEPLOYMENT.md` | Deployment procedures |
| Operations | `docs/OPERATIONS.md` | Operations runbook |
| Backup | `docs/BACKUP-RESTORE.md` | Backup procedures |
| API Reference | `docs/API.md` | API documentation |
| Performance | `docs/PERFORMANCE_IMPROVEMENT_PROPOSAL.md` | Performance optimization |
| AI Kernel | `docs/RTR_MRP_AI_KERNEL_MASTER_PROMPT.md` | AI configuration |
| Roadmap | `docs/RTR_MRP_ROADMAP_AI_FIRST.md` | AI-First strategy |
| DR Procedures | `docs/DR-PROCEDURES.md` | Disaster recovery |
| Monitoring | `docs/HA-MONITORING-GUIDE.md` | HA & monitoring |
| User Guide | `docs/USER_GUIDE.md` | End-user guide |
| Quick Start | `docs/QUICK-START.md` | Quick start guide |
| Training | `docs/TRAINING_SCRIPTS.md` | Training materials |
| Handover V1 | `docs/HANDOVER.md` | Previous handover (2026-01-17) |
| Handover V2 | `docs/RTR_MRP_HANDOVER_DOCUMENT_V2.md` | Previous handover (2026-01-13) |

## 20.2 Glossary

| Term | Definition |
|------|------------|
| MRP | Manufacturing Resource Planning |
| BOM | Bill of Materials |
| NCR | Non-Conformance Report |
| CAPA | Corrective And Preventive Action |
| SPC | Statistical Process Control |
| APS | Advanced Planning & Scheduling |
| ATP | Available To Promise |
| CTP | Capable To Promise |
| OEE | Overall Equipment Effectiveness |
| EOQ | Economic Order Quantity |
| LLC | Low Level Code (BOM explosion) |
| NDAA | National Defense Authorization Act |
| ITAR | International Traffic in Arms Regulations |
| FDA CFR 21 | FDA Code of Federal Regulations Part 21 |
| PWA | Progressive Web Application |
| TOTP | Time-based One-Time Password |
| RAG | Retrieval-Augmented Generation |

## 20.3 Checklist cho Developer Mới

```
NGÀY 1:
□ Clone repository
□ Setup local environment (.env)
□ Run application (npm run dev)
□ Đọc handover document này

TUẦN 1:
□ Hiểu architecture (Section 2)
□ Chạy E2E tests (npm run test:e2e)
□ Hiểu database schema (prisma/schema.prisma)
□ Duyệt qua API routes (/src/app/api/)
□ Hiểu Socket.io integration (server.ts)

TUẦN 2:
□ Hiểu MRP Engine (src/lib/mrp-engine/)
□ Hiểu AI services (src/lib/ai/)
□ Hiểu ML service (ml-service/)
□ Hiểu Quality module (components/quality/)
□ Hiểu Workflow engine

TUẦN 3:
□ Hiểu Docker deployment (docker/)
□ Hiểu backup/restore procedures
□ Hiểu monitoring & operations
□ Thực hành deploy test environment
□ Ready for feature development
```

## 20.4 Thay đổi so với V2

| Aspect | V2 (Jan 2026) | V3 (Feb 2026) |
|--------|---------------|---------------|
| Database Models | 50+ | **150+** |
| API Routes | 163+ | **289** |
| Component Categories | ~20 | **40+** |
| Dashboard Sections | ~10 | **39+** |
| ML Service | Mentioned | **Fully documented** |
| Docker Setup | Basic | **Multi-service orchestration** |
| Compliance | Not covered | **NDAA/ITAR/FDA documented** |
| Backup/DR | Basic | **Full DR procedures** |
| Finance Module | 20% | **40%** (GL, Costing, Invoicing) |
| Mobile/PWA | Not covered | **Offline, barcode, service worker** |
| Workflow Engine | Not covered | **Multi-level approvals** |
| Enterprise Features | Not covered | **Multi-tenancy, webhooks, API keys** |

---

# ═══════════════════════════════════════════════════════════════════════════════
#                              END OF HANDOVER DOCUMENT V3
#
#                    Document: RTR_MRP_HANDOVER_DOCUMENT_V3.md
#                    Version: 3.0
#                    Date: 2026-02-24
#                    Status: COMPLETE
# ═══════════════════════════════════════════════════════════════════════════════
