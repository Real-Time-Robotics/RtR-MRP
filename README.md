# RTR-MRP — Hệ thống Hoạch định Nguồn lực Sản xuất Drone

Hệ thống MRP (Material Requirements Planning) toàn diện cho sản xuất drone, tích hợp AI/ML để dự báo nhu cầu, quản lý chất lượng và tối ưu chi phí. Hỗ trợ thời gian thực qua WebSocket và hoạt động offline với PWA.

## Công nghệ

| Lớp | Công nghệ |
|-----|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, Shadcn/UI, Recharts |
| Backend | Next.js API Routes, Prisma ORM, Socket.io |
| Database | PostgreSQL, Redis (cache + queue) |
| Auth | NextAuth.js 5, 2FA (OTP) |
| AI/ML | Anthropic Claude, Python ML service |
| Infra | Docker, Kubernetes, Sentry, Prometheus |
| Testing | Vitest, Playwright E2E, k6 load testing |

## Tính năng chính

- **BOM đa cấp** — Quản lý cấu trúc sản phẩm, tính toán chi phí, so sánh phiên bản
- **Kho & Tồn kho** — Theo dõi realtime, quét barcode/QR, cảnh báo tồn kho thấp
- **Lệnh sản xuất** — Work orders, theo dõi tiến độ, quản lý công suất
- **Mua hàng** — Purchase orders, đánh giá nhà cung cấp (A-D), theo dõi giao hàng
- **Chất lượng** — NCR (Non-Conformance), CAPA, kiểm tra tuân thủ
- **AI/ML** — Dự báo nhu cầu, tối ưu chi phí, phân tích xu hướng
- **Tài chính** — Phân tích chi phí, báo cáo lợi nhuận, theo dõi ngân sách
- **Realtime** — Thông báo WebSocket, cập nhật dashboard trực tiếp
- **PWA** — Hoạt động offline, responsive mobile/tablet/desktop
- **Cổng nhà cung cấp & khách hàng** — Portal riêng cho đối tác

## Cài đặt nhanh

> **Lưu ý:** Toàn bộ source code nằm trong thư mục `rtr-mrp/`.

```bash
# Clone và cài đặt
git clone <repo-url> && cd RtR-MRP/rtr-mrp
cp .env.example .env        # Cấu hình DATABASE_URL, REDIS_URL, ...
npm install

# Khởi tạo database
npx prisma db push
npm run db:seed             # Dữ liệu mẫu

# Chạy dev
npm run dev                 # Server + Next.js (http://localhost:3000)

# ML Service (tuỳ chọn)
cd ml-service
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000
```

## Cấu trúc dự án

```
RtR-MRP/
├── rtr-mrp/                  # Source code chính
│   ├── src/
│   │   ├── app/              # Next.js App Router
│   │   │   ├── (auth)/       # Đăng nhập, đăng ký
│   │   │   ├── (dashboard)/  # Modules: BOM, inventory, production, quality, ...
│   │   │   ├── (portal)/     # Cổng nhà cung cấp/khách hàng
│   │   │   └── api/          # REST API routes
│   │   ├── components/       # React components
│   │   ├── hooks/            # Custom hooks
│   │   └── types/            # TypeScript definitions
│   ├── lib/                  # Utilities, AI, cache, security
│   ├── prisma/               # Schema & migrations
│   ├── ml-service/           # Python ML microservice
│   ├── e2e/                  # Playwright E2E tests
│   ├── docker/               # Docker configs
│   ├── k8s/                  # Kubernetes manifests
│   └── load-testing/         # k6 & Artillery tests
└── DEPLOYMENT.md             # Hướng dẫn triển khai
```

## Tài liệu

- [Hướng dẫn triển khai](./DEPLOYMENT.md)
- [Kiến trúc hệ thống](./rtr-mrp/docs/ARCHITECTURE.md)
- [API Reference](./rtr-mrp/docs/API.md)

## Giấy phép

Private — Bản quyền thuộc RTR. Không được phân phối hoặc sao chép khi chưa có sự cho phép.
