# ═══════════════════════════════════════════════════════════════════════════════
#                    RTR-MRP UI REDESIGN - THỢ XÂY MASTER PROMPT
#                    "Industrial Precision" Implementation Guide
#                    
#                    Version: 1.0
#                    Date: 2026-01-14
#                    Author: Kiến trúc sư trưởng (Claude AI)
# ═══════════════════════════════════════════════════════════════════════════════
#
#  📋 HƯỚNG DẪN SỬ DỤNG:
#  
#  1. Copy TOÀN BỘ file này → Paste vào Claude Code / Cursor / Windsurf
#  2. Trả lời đường dẫn repo khi được hỏi
#  3. Thợ sẽ tự động thực hiện từng Phase
#
# ═══════════════════════════════════════════════════════════════════════════════

---

## 🎭 VAI TRÒ CỦA BẠN

Bạn là **THỢ XÂY** trong hệ thống Vibecode Kit v4.0.

Kiến trúc sư và Chủ nhà đã **THỐNG NHẤT** bản thiết kế UI mới cho RTR-MRP.

### QUY TẮC TUYỆT ĐỐI:

```
1. KHÔNG thay đổi cấu trúc tables (columns, order, data mapping)
2. KHÔNG xóa features đang hoạt động
3. KHÔNG đổi tech stack
4. Gặp conflict → BÁO CÁO, không tự quyết định
5. Commit TỪNG BƯỚC, message rõ ràng
```

---

## 📊 TỔNG QUAN DỰ ÁN

| Field | Value |
|-------|-------|
| Tên dự án | RTR-MRP (DAFC Unified Intelligent Platform) |
| Stack | Next.js 14 + Prisma + PostgreSQL + Tailwind + shadcn/ui |
| Production | https://rtr-mrp.onrender.com |
| Vấn đề hiện tại | Build fail do audit-logger.ts + UI cần redesign |

---

## 🚀 BẮT ĐẦU

### Bước 0: Truy cập Repo

Hỏi Chủ nhà:
```
"Cho tôi đường dẫn đến thư mục dự án RTR-MRP trên máy của bạn."
```

Sau khi có path, chạy:
```bash
cd [PATH_TO_PROJECT]
git status
git log --oneline -5
```

Xác nhận:
- [ ] Đang ở đúng repo RTR-MRP
- [ ] Có thể thấy git history
- [ ] Biết branch hiện tại

---

# ═══════════════════════════════════════════════════════════════════════════════
#                              PHASE 1: STABILIZE
#                              (Fix Build Errors)
# ═══════════════════════════════════════════════════════════════════════════════

## Mục tiêu: Dự án BUILD và RUN được

### 1.1 Kiểm tra lỗi hiện tại

```bash
npm run build 2>&1 | head -100
```

Ghi nhận các lỗi, đặc biệt:
- [ ] audit-logger.ts errors
- [ ] Prisma schema mismatch
- [ ] TypeScript errors khác

### 1.2 Xem Prisma Schema

```bash
cat prisma/schema.prisma | grep -A 30 "model AuditLog"
```

Ghi nhận các fields thực sự có trong AuditLog model.

### 1.3 Fix audit-logger.ts

Mở file: `src/lib/audit/audit-logger.ts`

**Vấn đề thường gặp:**
- Field `summary` không tồn tại → Move vào `metadata` JSON
- Field `userRole` không tồn tại → Move vào `metadata` JSON
- Field `sessionId` không tồn tại → Move vào `metadata` JSON
- Relations `user`, `conversationLinks` không tồn tại → Xóa khỏi `include`

**Pattern fix:**

TRƯỚC:
```typescript
await prisma.auditLog.create({
  data: {
    action: 'CREATE',
    entityType: 'PART',
    entityId: partId,
    userId: userId,
    summary: 'Created new part',      // ❌ Field không tồn tại
    userRole: 'ADMIN',                // ❌ Field không tồn tại
    sessionId: 'abc123',              // ❌ Field không tồn tại
    changes: JSON.stringify(changes),
  }
})
```

SAU:
```typescript
await prisma.auditLog.create({
  data: {
    action: 'CREATE',
    entityType: 'PART',
    entityId: partId,
    userId: userId,
    changes: JSON.stringify(changes),
    metadata: JSON.stringify({        // ✅ Gộp vào metadata
      summary: 'Created new part',
      userRole: 'ADMIN',
      sessionId: 'abc123',
    }),
  }
})
```

**Fix queries với invalid relations:**

TRƯỚC:
```typescript
const logs = await prisma.auditLog.findMany({
  where: { entityId },
  include: {
    user: true,                       // ❌ Relation có thể không tồn tại
    conversationLinks: true,          // ❌ Relation có thể không tồn tại
  }
})
```

SAU:
```typescript
const logs = await prisma.auditLog.findMany({
  where: { entityId },
  // Xóa include block hoặc chỉ include relations thực sự tồn tại
})
```

### 1.4 Verify Fix

```bash
# Generate Prisma client
npx prisma generate

# Check TypeScript
npx tsc --noEmit

# Build
npm run build
```

**Checkpoint:**
- [ ] `npx prisma generate` → Success
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npm run build` → Build successful

### 1.5 Test Runtime

```bash
npm run dev
```

Trong terminal khác:
```bash
curl http://localhost:3000/api/health
```

**Checkpoint:**
- [ ] Server starts without errors
- [ ] API responds with JSON

### 1.6 Commit Phase 1

```bash
git add .
git commit -m "fix: Resolve Prisma schema mismatch in audit-logger

- Move summary, userRole, sessionId to metadata JSON field
- Remove invalid relations from include blocks
- Build now passes successfully"
```

---

# ═══════════════════════════════════════════════════════════════════════════════
#                              PHASE 2: INTEGRATE
#                        (Tích hợp Design System + Components)
# ═══════════════════════════════════════════════════════════════════════════════

## Mục tiêu: Áp dụng theme "Industrial Precision" vào project

### 2.1 Install Fonts

Mở `src/app/layout.tsx`, thêm:

```tsx
import { JetBrains_Mono, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const ibmPlexSans = IBM_Plex_Sans({ 
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({ 
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})
```

Update `<html>` tag:
```tsx
<html lang="vi" className={`${jetbrainsMono.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
```

### 2.2 Backup Tailwind Config

```bash
cp tailwind.config.ts tailwind.config.backup.ts
```

### 2.3 Update Tailwind Config

Replace `tailwind.config.ts` với nội dung từ **APPENDIX A** bên dưới.

### 2.4 Create Design System CSS

Tạo file `src/styles/design-system.css` với nội dung từ **APPENDIX B** bên dưới.

### 2.5 Update globals.css

Mở `src/app/globals.css`, thêm vào đầu file:

```css
@import '../styles/design-system.css';
```

Update body styles:
```css
body {
  font-family: var(--font-body);
  background-color: var(--steel-dark);
  color: var(--text-primary);
}
```

### 2.6 Test Build

```bash
npm run build
npm run dev
```

**Checkpoint:**
- [ ] Build passes
- [ ] Dev server starts
- [ ] UI shows dark theme

### 2.7 Commit Phase 2.1

```bash
git add .
git commit -m "feat(ui): Add Industrial Precision design system

- Install JetBrains Mono, IBM Plex fonts
- Add design-system.css with CSS variables
- Update Tailwind config with MRP theme
- Apply dark theme to body"
```

---

### 2.8 Update Layout Components

**⚠️ QUAN TRỌNG: Backup trước khi sửa**

```bash
cp src/components/layout/dashboard-layout-client.tsx src/components/layout/dashboard-layout-client.backup.tsx
```

#### Header Update

Tìm file Header component (có thể là `modern-header.tsx` hoặc trong `dashboard-layout-client.tsx`).

Apply classes mới:
```tsx
// Header container
className="fixed top-0 left-0 right-0 h-12 bg-gunmetal border-b border-mrp-border z-100 flex items-center px-4"

// Logo
className="font-display text-sm font-semibold text-mrp-text-primary flex items-center gap-2"

// Search input
className="input input-search max-w-[400px]"

// User button
className="flex items-center gap-2 px-2 py-1 bg-transparent border border-mrp-border text-mrp-text-primary text-xs hover:bg-slate"
```

#### Sidebar Update

Apply classes mới:
```tsx
// Sidebar container
className="fixed top-12 left-0 bottom-0 w-14 hover:w-[200px] bg-gunmetal border-r border-mrp-border transition-all duration-300 z-90 overflow-hidden"

// Nav item
className="flex items-center gap-3 px-3 py-2 text-mrp-text-secondary hover:bg-slate hover:text-mrp-text-primary transition-all"

// Active nav item
className="flex items-center gap-3 px-3 py-2 bg-info-cyan-dim text-info-cyan border-l-2 border-info-cyan"
```

### 2.9 Test Layout Changes

```bash
npm run dev
```

Kiểm tra:
- [ ] Header hiển thị đúng
- [ ] Sidebar collapse/expand hoạt động
- [ ] Navigation links hoạt động
- [ ] Dark theme consistent

### 2.10 Commit Phase 2.2

```bash
git add .
git commit -m "feat(ui): Update Header and Sidebar with Industrial theme

- Dark gunmetal background
- Cyan accent for active states
- Collapsible sidebar preserved
- All navigation links working"
```

---

### 2.11 Update Common Components

#### Buttons

Tìm Button component, thêm variants:

```tsx
const buttonVariants = {
  primary: "bg-info-cyan text-steel-dark border-info-cyan hover:bg-[#0891B2]",
  secondary: "bg-slate text-mrp-text-primary border-mrp-border hover:bg-slate-light",
  ghost: "bg-transparent text-mrp-text-secondary hover:bg-slate hover:text-mrp-text-primary",
  danger: "bg-urgent-red-dim text-urgent-red border-urgent-red/30 hover:bg-urgent-red/30",
  success: "bg-production-green-dim text-production-green border-production-green/30 hover:bg-production-green/30",
}

// Base classes
className="inline-flex items-center justify-center gap-1.5 h-8 px-3 font-body text-[13px] font-medium border transition-all cursor-pointer disabled:opacity-50"
```

#### Badges

```tsx
const badgeVariants = {
  success: "bg-production-green-dim text-production-green",
  warning: "bg-alert-amber-dim text-alert-amber", 
  danger: "bg-urgent-red-dim text-urgent-red",
  info: "bg-info-cyan-dim text-info-cyan",
  neutral: "bg-zinc-500/20 text-zinc-400",
}

// Base classes
className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
```

#### Cards

```tsx
// Card container
className="bg-gunmetal/50 border border-mrp-border"

// Card header
className="px-4 py-3 border-b border-mrp-border flex items-center justify-between"

// Card title
className="text-xs font-semibold uppercase tracking-wide text-mrp-text-secondary"
```

### 2.12 Commit Phase 2.3

```bash
git add .
git commit -m "feat(ui): Update Button, Badge, Card components

- New button variants: primary/secondary/ghost/danger/success
- Badge styles with status colors
- Card with gunmetal background
- Sharp edges (no border-radius)"
```

---

### 2.13 Update Table Styling (⚠️ EXCEL-FIRST)

**🔒 CRITICAL: CHỈ thay đổi CSS, KHÔNG đụng structure**

Tìm các Table components và chỉ update className:

```tsx
// Table container
className="w-full border-collapse text-[13px] font-body"

// Table header
className="sticky top-0 z-10 bg-gunmetal text-mrp-text-muted text-[11px] font-medium uppercase tracking-wide text-left p-2 border border-mrp-border"

// Table cell
className="p-2 border border-mrp-border bg-transparent"

// Numeric cell (QUAN TRỌNG: giữ right-align + monospace)
className="p-2 border border-mrp-border bg-transparent text-right font-mono"

// Row hover
className="hover:bg-slate/30"

// Selected row
className="bg-info-cyan-dim border-l-2 border-l-info-cyan"
```

**⚠️ KHÔNG ĐƯỢC:**
- Thay đổi column definitions
- Thay đổi data mapping
- Xóa sort functionality
- Xóa filter functionality
- Thay đổi column order

### 2.14 Test Tables

```bash
npm run dev
```

Kiểm tra TỪNG module:
- [ ] Parts table: columns đúng, sort hoạt động
- [ ] BOM table: columns đúng, sort hoạt động
- [ ] Work Orders table: columns đúng, sort hoạt động
- [ ] Purchase Orders table: columns đúng, sort hoạt động
- [ ] Inventory table: columns đúng, sort hoạt động
- [ ] Quality table: columns đúng, sort hoạt động

### 2.15 Commit Phase 2.4

```bash
git add .
git commit -m "style(ui): Apply Industrial theme to tables (structure preserved)

- Dark theme colors
- Monospace font for numbers (right-aligned)
- Sticky headers preserved
- Sort/filter functionality verified
- All columns and data mapping unchanged"
```

---

# ═══════════════════════════════════════════════════════════════════════════════
#                              PHASE 3: EXPAND
#                          (Thêm Components Còn Thiếu)
# ═══════════════════════════════════════════════════════════════════════════════

## Mục tiêu: Hoàn thiện component library

### 3.1 Modal Component

Tạo `src/components/ui/modal.tsx`:

```tsx
'use client'

import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full ${sizeClasses[size]} mx-4 bg-gunmetal border border-mrp-border shadow-dropdown animate-fade-in`}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-mrp-border">
            <h2 className="text-md font-semibold text-mrp-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 text-mrp-text-muted hover:text-mrp-text-primary hover:bg-slate transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}
        
        {/* Body */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}
```

### 3.2 ConfirmDialog Component

Tạo `src/components/ui/confirm-dialog.tsx`:

```tsx
'use client'

import { Modal } from './modal'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'danger'
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: {
      icon: 'text-urgent-red',
      button: 'bg-urgent-red text-white hover:bg-red-600',
    },
    warning: {
      icon: 'text-alert-amber',
      button: 'bg-alert-amber text-steel-dark hover:bg-amber-500',
    },
    info: {
      icon: 'text-info-cyan',
      button: 'bg-info-cyan text-steel-dark hover:bg-cyan-500',
    },
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center">
        <div className={`p-3 rounded-full bg-slate mb-4 ${variantStyles[variant].icon}`}>
          <AlertTriangle size={24} />
        </div>
        
        <h3 className="text-lg font-semibold text-mrp-text-primary mb-2">
          {title}
        </h3>
        
        <p className="text-sm text-mrp-text-secondary mb-6">
          {message}
        </p>
        
        <div className="flex gap-3 w-full">
          <button
            onClick={onClose}
            className="flex-1 h-9 px-4 bg-slate text-mrp-text-primary border border-mrp-border hover:bg-slate-light transition-colors text-sm font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`flex-1 h-9 px-4 border-0 transition-colors text-sm font-medium ${variantStyles[variant].button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}
```

### 3.3 Toast Component

Tạo `src/components/ui/toast.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const toastStyles = {
  success: 'bg-production-green-dim border-production-green/30 text-production-green',
  error: 'bg-urgent-red-dim border-urgent-red/30 text-urgent-red',
  warning: 'bg-alert-amber-dim border-alert-amber/30 text-alert-amber',
  info: 'bg-info-cyan-dim border-info-cyan/30 text-info-cyan',
}

// Toast store (simple implementation)
let toasts: Toast[] = []
let listeners: ((toasts: Toast[]) => void)[] = []

function notify(toasts: Toast[]) {
  listeners.forEach(listener => listener(toasts))
}

export const toast = {
  success: (message: string) => {
    const id = Date.now().toString()
    toasts = [...toasts, { id, type: 'success', message }]
    notify(toasts)
    setTimeout(() => toast.dismiss(id), 4000)
  },
  error: (message: string) => {
    const id = Date.now().toString()
    toasts = [...toasts, { id, type: 'error', message }]
    notify(toasts)
    setTimeout(() => toast.dismiss(id), 6000)
  },
  warning: (message: string) => {
    const id = Date.now().toString()
    toasts = [...toasts, { id, type: 'warning', message }]
    notify(toasts)
    setTimeout(() => toast.dismiss(id), 5000)
  },
  info: (message: string) => {
    const id = Date.now().toString()
    toasts = [...toasts, { id, type: 'info', message }]
    notify(toasts)
    setTimeout(() => toast.dismiss(id), 4000)
  },
  dismiss: (id: string) => {
    toasts = toasts.filter(t => t.id !== id)
    notify(toasts)
  },
}

export function ToastContainer() {
  const [items, setItems] = useState<Toast[]>([])

  useEffect(() => {
    listeners.push(setItems)
    return () => {
      listeners = listeners.filter(l => l !== setItems)
    }
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2">
      {items.map(item => {
        const Icon = toastIcons[item.type]
        return (
          <div
            key={item.id}
            className={`flex items-center gap-3 px-4 py-3 border animate-slide-in ${toastStyles[item.type]}`}
          >
            <Icon size={18} />
            <span className="text-sm font-medium">{item.message}</span>
            <button
              onClick={() => toast.dismiss(item.id)}
              className="ml-2 opacity-70 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
```

### 3.4 LoadingSpinner Component

Tạo `src/components/ui/loading-spinner.tsx`:

```tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-info-cyan border-t-transparent ${sizeClasses[size]} ${className}`}
    />
  )
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        <span className="text-sm text-mrp-text-muted">Đang tải...</span>
      </div>
    </div>
  )
}
```

### 3.5 EmptyState Component

Tạo `src/components/ui/empty-state.tsx`:

```tsx
import { Inbox, Search, FileX } from 'lucide-react'

interface EmptyStateProps {
  icon?: 'inbox' | 'search' | 'file'
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

const icons = {
  inbox: Inbox,
  search: Search,
  file: FileX,
}

export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  const Icon = icons[icon]
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="p-4 bg-slate rounded-full mb-4">
        <Icon size={32} className="text-mrp-text-muted" />
      </div>
      
      <h3 className="text-md font-semibold text-mrp-text-primary mb-1">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-mrp-text-secondary text-center max-w-md mb-4">
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className="h-8 px-4 bg-info-cyan text-steel-dark text-sm font-medium hover:bg-cyan-500 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
```

### 3.6 Commit Phase 3

```bash
git add .
git commit -m "feat(ui): Add Modal, Toast, Loading, EmptyState components

- Modal with keyboard support (Escape to close)
- ConfirmDialog for delete/action confirmations
- Toast notifications with auto-dismiss
- LoadingSpinner and PageLoading
- EmptyState for no-data scenarios"
```

---

# ═══════════════════════════════════════════════════════════════════════════════
#                              PHASE 4: POLISH
#                              (QA + Deploy)
# ═══════════════════════════════════════════════════════════════════════════════

## Mục tiêu: Kiểm tra và deploy

### 4.1 Full Build Test

```bash
npm run build
```

**Checkpoint:**
- [ ] 0 errors
- [ ] 0 warnings (hoặc warnings acceptable)
- [ ] All routes generated

### 4.2 E2E Tests

```bash
npm run test:e2e
```

Nếu tests fail do selector changes:
- Update selectors trong test files
- KHÔNG disable tests

### 4.3 Manual QA Checklist

```
LAYOUT:
□ Header hiển thị đúng
□ Sidebar collapse/expand
□ Navigation hoạt động
□ Search bar hoạt động
□ User menu hoạt động

TABLES (CRITICAL):
□ Parts: columns đúng, sort, filter
□ BOM: columns đúng, sort, filter
□ Work Orders: columns đúng, sort, filter
□ Purchase Orders: columns đúng, sort, filter
□ Inventory: columns đúng, sort, filter
□ Quality: columns đúng, sort, filter
□ MRP: columns đúng, sort, filter

FORMS:
□ Create forms hoạt động
□ Edit forms hoạt động
□ Validation hiển thị đúng
□ Submit hoạt động

FEATURES (Phase 1-4):
□ Chat/Discussions hoạt động
□ Screenshot capture hoạt động
□ Audit trail hiển thị
□ AI features hoạt động (nếu có API key)

RESPONSIVE:
□ Desktop (1920px)
□ Laptop (1366px)
□ Tablet (768px) - basic functionality
```

### 4.4 Final Commit

```bash
git add .
git commit -m "chore: QA fixes and polish

- Fix any remaining styling issues
- Update E2E test selectors
- Verify all features working"
```

### 4.5 Push to Remote

```bash
git push origin main
```

### 4.6 Deploy to Render

Render sẽ auto-deploy khi push to main.

Monitor:
```bash
# Check Render dashboard for build status
# https://dashboard.render.com
```

### 4.7 Post-Deploy Verification

Truy cập: https://rtr-mrp.onrender.com

Kiểm tra:
- [ ] UI mới hiển thị
- [ ] Tất cả features hoạt động
- [ ] Không có console errors

---

# ═══════════════════════════════════════════════════════════════════════════════
#                              APPENDIX A: TAILWIND CONFIG
# ═══════════════════════════════════════════════════════════════════════════════

```typescript
// tailwind.config.ts
// Copy toàn bộ file từ deliverables đã cung cấp
// Xem file: tailwind.config.ts trong package
```

---

# ═══════════════════════════════════════════════════════════════════════════════
#                              APPENDIX B: DESIGN SYSTEM CSS
# ═══════════════════════════════════════════════════════════════════════════════

```css
/* design-system.css */
/* Copy toàn bộ file từ deliverables đã cung cấp */
/* Xem file: design-system.css trong package */
```

---

# ═══════════════════════════════════════════════════════════════════════════════
#                              APPENDIX C: TABLE PRESERVATION RULES
# ═══════════════════════════════════════════════════════════════════════════════

```
⚠️ TUYỆT ĐỐI KHÔNG:

• Xóa bất kỳ column nào
• Thay đổi thứ tự columns
• Đổi tên columns
• Thay đổi data type display
• Xóa sort/filter functionality
• Thay đổi number formatting
• Convert table sang card layout
• Ẩn columns mà không có user control

CHỈ ĐƯỢC thay đổi:
• Background colors
• Border colors
• Text colors
• Hover effects
• Font family/size (giữ monospace cho số)
```

---

# ═══════════════════════════════════════════════════════════════════════════════
#                              TROUBLESHOOTING
# ═══════════════════════════════════════════════════════════════════════════════

### Lỗi: "Field does not exist in Prisma schema"

```bash
# Xem schema thực tế
cat prisma/schema.prisma | grep -A 20 "model [ModelName]"

# Sync Prisma client
npx prisma generate
```

### Lỗi: "Module not found"

```bash
# Clear cache
rm -rf .next
rm -rf node_modules/.cache

# Reinstall
npm install
```

### Lỗi: "Hydration mismatch"

- Check server vs client rendering
- Ensure no `window` access during SSR
- Use `'use client'` directive if needed

### UI không update sau khi sửa CSS

```bash
# Clear browser cache
# Hoặc Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)

# Clear Next.js cache
rm -rf .next
npm run dev
```

---

# ═══════════════════════════════════════════════════════════════════════════════
#                              END OF MASTER PROMPT
# ═══════════════════════════════════════════════════════════════════════════════
#
#  Tài liệu này được tạo bởi: Kiến trúc sư trưởng (Claude AI)
#  Ngày: 2026-01-14
#  Version: 1.0
#
#  Khi hoàn thành, báo cáo lại cho Chủ nhà:
#  - Số commits đã tạo
#  - Các vấn đề đã fix
#  - Kết quả QA
#  - Link production
#
# ═══════════════════════════════════════════════════════════════════════════════
