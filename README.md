# RTR MRP System

Hệ thống Hoạch định Nguồn lực Sản xuất (MRP) cho doanh nghiệp sản xuất drone.

## Tính năng chính

- **BOM Management** - Quản lý cấu trúc sản phẩm đa cấp
- **MRP Planning** - Hoạch định nhu cầu vật tư với ATP/CTP, Pegging, Simulation
- **Production** - Quản lý Work Orders, Routing, Capacity Planning, OEE
- **Quality Management** - NCR, CAPA, Inspection Plans, Traceability
- **Finance** - Costing, GL, Invoicing
- **AI/ML** - Demand Forecasting, Lead Time Prediction
- **Mobile PWA** - Barcode scanning, Offline support
- **Excel Import/Export** - Nhập xuất dữ liệu Excel

## Cài đặt

```bash
# Clone repository
git clone <repository-url>
cd rtr-mrp

# Cài đặt dependencies
npm install

# Tạo database
npx prisma db push

# Seed dữ liệu mẫu
npx prisma db seed

# Chạy development server
npm run dev
```

## Demo Credentials

```
Email:    admin@rtr.com
Password: admin123456@
```

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **UI:** Tailwind CSS + shadcn/ui
- **Auth:** NextAuth.js v5
- **Charts:** Recharts
- **PWA:** next-pwa

## Cấu trúc dự án

```
src/
├── app/                 # Next.js App Router pages
│   ├── (auth)/         # Authentication pages
│   ├── (dashboard)/    # Main application pages
│   ├── api/            # API routes
│   └── mobile/         # Mobile PWA pages
├── components/         # React components
├── lib/               # Business logic & utilities
│   ├── mrp/           # MRP engines (ATP, Pegging, Simulation)
│   ├── ai/            # AI/ML services
│   ├── compliance/    # Security & compliance
│   └── mobile/        # Mobile utilities
└── hooks/             # Custom React hooks
```

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/rtr_mrp"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

## License

Proprietary - RTR Technologies
