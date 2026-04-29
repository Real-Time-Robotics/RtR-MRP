# Sprint 28.5 · Adoption Polish

**Approved:** 2026-04-29 by Lâm
**Branch:** `feat/sprint-28.5-adoption-polish` (tách từ `main`)
**Duration:** 3-5 ngày · 6 TIP · 3 wave

## Mục tiêu

Phòng RTR login lần đầu thấy ngay value, không bị empty/confused. Fix 4 P0 + 2 P1 từ nghiệm thu.

## Task Graph

```
Wave 1 (parallel):
  ┌── TIP-S285-01 · Disable/remove top header navigation
  ├── TIP-S285-02 · Home dashboard empty state — replace 0.0% red với CTA
  └── TIP-S285-03 · Realistic seed demo data

Wave 2 (depend Wave 1):
  └── TIP-S285-04 · /admin/users live (list + assign role)

Wave 3 (parallel, depend Wave 2):
  ┌── TIP-S285-05 · Onboarding walkthrough lần đầu login
  └── TIP-S285-06 · UX polish: skeleton loading + empty state CTA
```

## Verify cuối sprint

1. Top header navigation 5 dropdown (HOME OPERATIONS PRODUCTION QUALITY ANALYTICS) đã ẩn. Sidebar v2 là duy nhất.
2. Home dashboard không còn 0.0% đỏ. Empty state có CTA "Tạo plan đầu".
3. `npx tsx prisma/seed-demo.ts` tạo 3 WC + 5 Equipment + 5 WO + 1 Plan + 3 Shift + 5 user role.
4. Admin login → `/admin/users` → list + assign role inline.
5. User mới login lần đầu → tour 3-4 step.
6. 6 page chính có skeleton loading + empty state CTA.

## Out-of-scope

Defer Sprint 29:
- Bridge Layer onboarding walkthrough chi tiết.
- Notifications real-time.
- Dark mode toggle verify.
- Language switcher.
- A11y audit deep.
- Search global ⌘K.
- AI Insights (defer hoặc remove khỏi sidebar).
