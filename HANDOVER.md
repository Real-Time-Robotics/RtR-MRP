# RTR MRP - HANDOVER DOCUMENT
> Last updated: 2025-12-31 (UI-API Integration Complete)

---

## TRANG THAI HIEN TAI: UI-API Integration Complete - Build OK

### LENH TIEP TUC NHANH
Khi quay lai, chi can noi:
- **"continue"** / **"tiep tuc"** / **"handover"** - de tiep tuc cong viec
- **"kiem tra deployment"** - de xem trang thai Render
- **"fix bug [mo ta]"** - de sua loi
- **"them feature [mo ta]"** - de them tinh nang

---

## DA HOAN THANH (2025-12-31)

### 0. UI-API Integration (NEW - 8/8 pages)
Tao 8 Connected Pages su dung hooks tu `use-data.ts`:

| Page | File | Hook | Status |
|------|------|------|--------|
| Dashboard | `dashboard-connected.tsx` | `useDashboard()` | OK |
| Parts | `parts-master-connected.tsx` | `useParts()` | OK |
| Sales | `sales-orders-connected.tsx` | `useSalesOrders()` | OK |
| Production | `production-connected.tsx` | `useWorkOrders()` | OK |
| Quality | `quality-connected.tsx` | `useNCRs()` | OK |
| Inventory | `inventory-connected.tsx` | `useInventory()` | OK |
| BOM | `bom-connected.tsx` | `useBOMs()`, `useBOM()` | OK |
| Analytics | `analytics-connected.tsx` | `useAnalytics*()` | OK |

**Features:**
- Loading skeletons cho tung page
- Error states voi retry buttons
- Dark mode support (Tailwind dark:)
- Pagination, filtering, search
- Detail panels cho selected items
- Kanban/List view modes (Sales, Production, Quality)

### 1. Fix Prisma Schema Mismatches (CRITICAL)
Tat ca field names da duoc align voi `prisma/schema.prisma`:

| Model | Field Cu | Field Dung |
|-------|----------|------------|
| **Customer** | email | contactEmail |
| **Customer** | phone | contactPhone |
| **Customer** | address | billingAddress |
| **SalesOrder** | soNumber | orderNumber |
| **SalesOrder** | requestedDate | requiredDate |
| **SalesOrderLine** | discountPercent | discount |
| **WorkOrder** | dueDate | plannedEnd |
| **WorkOrder** | completionDate | actualEnd |
| **WorkOrder** | startDate | plannedStart |
| **WorkOrderOperation** | operationSeq | operationNumber |
| **WorkOrderOperation** | operationName | name |
| **Part** | minStock | minStockLevel |
| **Part** | critical | isCritical |
| **Part** | primarySupplier | partSuppliers (relation) |
| **Part** | inventoryItems | inventory |
| **BomLine** | productId | bomId |
| **BomLine** | module | moduleName |
| **BomLine** | critical | isCritical |
| **NCR** | capas | capa (singular) |
| **NCR** | costImpact | totalCost |
| **NCR** | dateCreated | createdAt |
| **CAPA** | dueDate | targetDate |
| **PartSupplier** | isPrimary | isPreferred |

### 2. Fix TypeScript Errors
| File | Van de | Cach fix |
|------|--------|----------|
| `card-animated.tsx` | Interface conflict | `Omit<HTMLAttributes, 'title'>` |
| `error-handler.ts` | ZodError API | `.errors` → `.issues` |
| `schemas.ts` | ZodError API | `.errors` → `.issues` |
| `sanitize.ts` | Map iteration | `for...of` → `forEach` |

### 3. API Routes V2 (8/8 routes - 100%)
| API | File | Status |
|-----|------|--------|
| Dashboard | `src/app/api/v2/dashboard/route.ts` | OK |
| Parts | `src/app/api/v2/parts/route.ts` | OK |
| Sales | `src/app/api/v2/sales/route.ts` | OK |
| Production | `src/app/api/v2/production/route.ts` | OK |
| Quality | `src/app/api/v2/quality/route.ts` | OK |
| Inventory | `src/app/api/v2/inventory/route.ts` | OK |
| BOM | `src/app/api/v2/bom/route.ts` | OK |
| Analytics | `src/app/api/v2/analytics/route.ts` | OK |

---

## DEPLOYMENT INFO

### Render.com
- **Web Service:** Auto-deploy tu GitHub `main` branch
- **Database:** PostgreSQL (managed by Render)
- **Build Command:** `npm run build`
- **Start Command:** `npm start`

### Environment Variables (Render Dashboard)
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-app.onrender.com
```

### Git Workflow
```bash
# Sua code
npm run build                 # Test build local
git add -A && git commit -m "message"
git push                      # Auto deploy to Render
```

---

## LOCAL DEVELOPMENT

### Start Dev Server
```bash
npm run dev                   # http://localhost:3000 (hoac 3001, 3002)
```

### V2 Pages
| Page | URL |
|------|-----|
| Dashboard | http://localhost:3000/v2/dashboard |
| Parts | http://localhost:3000/v2/parts |
| Sales | http://localhost:3000/v2/sales |
| Production | http://localhost:3000/v2/production |
| Quality | http://localhost:3000/v2/quality |
| Inventory | http://localhost:3000/v2/inventory |
| BOM | http://localhost:3000/v2/bom |
| Analytics | http://localhost:3000/v2/analytics |

### Test API
```bash
curl --http1.1 -s "http://localhost:3000/api/v2/dashboard"
curl --http1.1 -s "http://localhost:3000/api/v2/inventory?pageSize=10"
```

---

## TROUBLESHOOTING

### Build Fail - Prisma Error
```bash
npx prisma generate           # Regenerate client
# Kiem tra field names trong prisma/schema.prisma
```

### Build Fail - TypeScript
- ZodError dung `.issues` KHONG phai `.errors`
- Interface extends HTMLAttributes? Dung `Omit<>`
- Map iteration? Dung `forEach` thay vi `for...of`

### Database Issues
```bash
npx prisma db push            # Push schema to DB
npx prisma studio             # Open DB GUI
```

---

## CONG VIEC TIEP THEO (GOI Y)

### Option A: Tich hop Connected Pages vao App (RECOMMENDED)
Connected pages da tao xong, can:
1. Cap nhat routes trong `/src/app/v2/` de su dung `*-connected.tsx`
2. Test CRUD operations (Create, Read, Update, Delete)
3. Test edge cases (empty data, errors, slow network)

### Option B: Them tinh nang
1. Real-time updates (WebSocket)
2. Export PDF/Excel
3. Email notifications
4. Advanced reporting

### Option C: Toi uu
1. Redis caching
2. Performance optimization
3. Unit tests
4. E2E tests

---

## FILES QUAN TRONG

```
prisma/schema.prisma          # DATABASE SCHEMA (SOURCE OF TRUTH)
src/app/api/v2/               # API routes
src/lib/hooks/use-data.ts     # Data fetching hooks
src/app/v2/                   # V2 UI pages
src/components/pages-v2/      # V2 components
  ├── *-connected.tsx         # NEW: Connected pages (8 files)
  └── *.tsx                   # Original mock pages
.env                          # Local env vars
render.yaml                   # Render config
HANDOVER.md                   # This file
```

---

## RECENT COMMITS

```
e6897e5 fix: Comprehensive Prisma schema alignment for production build
f419fc2 Fix Part field names: minStock → minStockLevel
5aa4bdd Fix SalesOrder field name: soNumber → orderNumber
f4968a9 Fix Inventory field names
85dedf5 Fix WorkOrder field names in analytics API
```

---

## BUILD STATUS

| Check | Status |
|-------|--------|
| TypeScript | PASS |
| Prisma Generate | PASS |
| Next.js Build | PASS |
| Git Push | PASS |
| Render Deploy | Auto-triggered |

---

**San sang cho:** Route Integration, Feature Development, hoac Production Testing

---

## LUU Y KHI TICH HOP ROUTES

De su dung connected pages, cap nhat file page trong `/src/app/v2/[page]/page.tsx`:

```tsx
// Thay doi import tu:
import { PartsMaster } from '@/components/pages-v2/parts-master';
// Thanh:
import { PartsMasterConnected } from '@/components/pages-v2/parts-master-connected';

// Thay doi component:
export default function PartsPage() {
  return <PartsMasterConnected />;
}
```
