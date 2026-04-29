# Sprint 27.5 · Fix-it Sprint — Sidebar Routes + X-Ray

**Approved:** 2026-04-28 by Lâm
**Branch:** `fix/sprint-27.5-sidebar-routes-xray` (tách từ `main`)
**Duration:** 1-2 ngày · 3 TIP · 1 wave (parallel TIP-01+02, sau đó TIP-03)
**Pause:** Sprint 28 hoãn 1-2 ngày, TIP-S28-01/02 đợi.

---

## Trigger

Lâm test sản phẩm sau deploy Sprint 27 — gặp 404 ngay tab `/my-work/created`. X-Ray audit phát hiện:

- **40 link sidebar v2:** 22 OK · 8 sai path (route thật ở chỗ khác) · 10 thiếu page hoàn toàn.
- **Top-nav header (HOME/OPERATIONS/PRODUCTION/QUALITY/ANALYTICS):** ~30 link chưa scan đầy đủ — TIP-03 sẽ làm.
- Sprint 27 TIP-S27-06 acceptance "mỗi sub-menu link sang route hiện có, không 404" KHÔNG được verify đủ.

## Mục tiêu Sprint 27.5

1. Sửa sidebar v2 trỏ về route đúng → 0 link 404.
2. Tạo skeleton page cho route thật sự thiếu.
3. X-Ray full app: audit mọi `<Link>` + `router.push(`, deep link, top-nav header — ra danh sách bug + ưu tiên fix.

## Phạm vi

| TIP | Mục tiêu |
|---|---|
| TIP-S275-01 | Sidebar v2 path correction (8 path sai) + test matrix update |
| TIP-S275-02 | Tạo 14 skeleton page cho route thiếu |
| TIP-S275-03 | X-Ray full app: scan link + deep link + top-nav + report |

## Constraints

- KHÔNG mở scope mới (KHÔNG implement business logic, chỉ skeleton + path fix).
- KHÔNG đụng Sprint 28 schema/work.
- KHÔNG xoá route legacy.
- Reuse pattern Sprint 27 skeleton page.
- Mỗi TIP 1 commit, conventional commits (`fix(ui):`, `feat(ui):`, `chore(audit):`).

## Verify

Sau 3 TIP nộp Completion Report:

1. Manual smoke 6 role: click qua mọi sidebar link → 0 link 404.
2. `npm run dev` + click qua top-nav 5 tab + sub-menu → 0 link 404 hoặc liệt kê rõ trong X-Ray report.
3. Deploy production sau merge → Lâm test live không 404.

## Sau Sprint 27.5

Resume Sprint 28 — Wave 1 (TIP-S28-01 schema + TIP-S28-02 sidebar Sản xuất).
