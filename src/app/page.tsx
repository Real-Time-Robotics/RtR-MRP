// =============================================================================
// RTR MRP - PREMIUM LANDING PAGE
// Bilingual EN/VI with Light/Dark Theme Support
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import {
  ChevronRight,
  Boxes,
  Factory,
  TrendingUp,
  ShieldCheck,
  Code,
  Lock,
  Terminal,
  Network,
  Database,
  BookOpen,
  GitFork,
  Mail,
  Zap,
  FileCode,
  Palette,
  Server,
  TestTube2,
} from 'lucide-react';
import { ThemeToggle } from '@/components/landing/theme-toggle';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default async function LandingPage() {
  // If user is logged in, redirect to dashboard
  // Wrap in try-catch to handle database connection failures gracefully
  try {
    const session = await auth();
    if (session) {
      redirect('/home');
    }
  } catch (error) {
    // If auth fails (e.g., database not available), continue to show landing page
    console.error('Auth check failed:', error);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-zinc-900 dark:text-neutral-50 font-[system-ui] antialiased transition-colors duration-300">
      {/* ================================================================== */}
      {/* NAVIGATION */}
      {/* ================================================================== */}

      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-2xl border-b border-zinc-200 dark:border-neutral-800/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Bloomberg-style Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded flex items-center justify-center bg-neutral-900 dark:bg-neutral-800">
                <span className="text-[9px] font-bold text-white font-mono">MRP</span>
              </div>
              <span className="text-sm font-bold tracking-tight font-mono flex items-end">MRP<span className="w-1 h-1 rounded-full bg-orange-500 ml-0.5 mb-0.5" /></span>
            </div>

            {/* Center Nav */}
            <div className="hidden md:flex items-center gap-1">
              {[
                { href: '#features', label: 'Features', labelVi: 'Tính năng' },
                { href: '#docs', label: 'Docs', labelVi: 'Tài liệu' },
                { href: '#api', label: 'API', labelVi: 'API' },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="px-4 py-2 text-[13px] font-medium rounded-lg transition-colors text-zinc-600 dark:text-neutral-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
                >
                  {item.label}
                </a>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 h-8 px-4 text-[13px] font-medium rounded-md transition-all bg-zinc-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-zinc-800 dark:hover:bg-neutral-100"
              >
                Dashboard
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ================================================================== */}
      {/* HERO */}
      {/* ================================================================== */}

      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Subtle gradient */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[150px] bg-blue-500/10 dark:bg-blue-500/5" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide uppercase mb-8 bg-zinc-100 dark:bg-neutral-800/80 text-zinc-600 dark:text-neutral-400 border border-zinc-200 dark:border-neutral-700/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Enterprise MRP System</span>
                <span className="text-zinc-400 dark:text-neutral-600">•</span>
                <span>Hệ thống MRP Doanh nghiệp</span>
              </div>

              {/* Title - Bloomberg Style */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.02em] leading-[1.1] mb-2 font-mono">
                <span className="text-zinc-900 dark:text-white">MRP</span>
                <span className="text-orange-500">.</span>
              </h1>
              <p className="text-lg lg:text-xl font-mono text-zinc-500 dark:text-neutral-500 mb-8 tracking-tight">
                Manufacturing Resource Planning
              </p>

              {/* Subtitle - Terminal Style */}
              <div className="font-mono text-sm max-w-2xl mb-10 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-orange-500 select-none">&gt;</span>
                  <span className="text-zinc-700 dark:text-neutral-300">Enterprise inventory, production & quality management</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-orange-500 select-none">&gt;</span>
                  <span className="text-zinc-500 dark:text-neutral-500">Quản lý tồn kho, sản xuất và chất lượng doanh nghiệp</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] bg-zinc-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-zinc-800 dark:hover:bg-neutral-100"
                >
                  Truy cập Dashboard
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all bg-zinc-100 dark:bg-neutral-800 text-zinc-700 dark:text-neutral-200 hover:bg-zinc-200 dark:hover:bg-neutral-700"
                >
                  <BookOpen className="w-4 h-4" />
                  Đọc Tài liệu
                </Link>
              </div>
            </div>

            {/* Right - Bloomberg Terminal Animation */}
            <div className="hidden lg:block">
              <div className="relative bg-white dark:bg-neutral-900 rounded-lg border border-zinc-200 dark:border-neutral-800 overflow-hidden shadow-2xl">
                {/* Terminal Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-neutral-800 border-b border-zinc-200 dark:border-neutral-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-neutral-500">MRP TERMINAL</span>
                  <div className="w-12" />
                </div>

                {/* Terminal Content */}
                <div className="p-4 font-mono text-xs space-y-3">
                  {/* Live Metrics */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-zinc-100 dark:bg-neutral-800/50 rounded p-2">
                      <div className="text-zinc-500 dark:text-neutral-500 text-[10px]">INVENTORY</div>
                      <div className="text-emerald-600 dark:text-emerald-400 text-lg font-bold animate-pulse">1,247</div>
                      <div className="text-emerald-600 dark:text-emerald-500 text-[10px]">▲ +12</div>
                    </div>
                    <div className="bg-zinc-100 dark:bg-neutral-800/50 rounded p-2">
                      <div className="text-zinc-500 dark:text-neutral-500 text-[10px]">PRODUCTION</div>
                      <div className="text-blue-600 dark:text-blue-400 text-lg font-bold">89%</div>
                      <div className="text-blue-600 dark:text-blue-500 text-[10px]">● ACTIVE</div>
                    </div>
                    <div className="bg-zinc-100 dark:bg-neutral-800/50 rounded p-2">
                      <div className="text-zinc-500 dark:text-neutral-500 text-[10px]">QUALITY</div>
                      <div className="text-orange-600 dark:text-orange-400 text-lg font-bold">99.2%</div>
                      <div className="text-orange-600 dark:text-orange-500 text-[10px]">FPY RATE</div>
                    </div>
                  </div>

                  {/* Chart Animation */}
                  <div className="bg-zinc-50 dark:bg-neutral-800/30 rounded p-3">
                    <div className="text-zinc-500 dark:text-neutral-500 text-[10px] mb-2">PRODUCTION OUTPUT</div>
                    <div className="flex items-end gap-1 h-16">
                      {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-orange-500 to-orange-400 rounded-t opacity-80"
                          style={{
                            height: `${h}%`,
                            animation: `pulse 2s ease-in-out ${i * 0.1}s infinite`
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Live Feed */}
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between text-zinc-600 dark:text-neutral-400">
                      <span className="text-emerald-500">●</span>
                      <span>WO-2024-1847 completed</span>
                      <span className="text-zinc-400 dark:text-neutral-600">2s ago</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 dark:text-neutral-400">
                      <span className="text-blue-500">●</span>
                      <span>Part P-00421 restocked</span>
                      <span className="text-zinc-400 dark:text-neutral-600">15s ago</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 dark:text-neutral-400">
                      <span className="text-orange-500">●</span>
                      <span>QC inspection passed</span>
                      <span className="text-zinc-400 dark:text-neutral-600">32s ago</span>
                    </div>
                  </div>

                  {/* Blinking Cursor */}
                  <div className="flex items-center gap-1 text-zinc-500 dark:text-neutral-500">
                    <span className="text-orange-500">&gt;</span>
                    <span className="animate-pulse">_</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl overflow-hidden bg-zinc-200 dark:bg-neutral-800/50">
            {[
              { value: '1,250+', label: 'Parts Managed', labelVi: 'Linh kiện' },
              { value: '10K+', label: 'Orders Processed', labelVi: 'Đơn hàng' },
              { value: '99.9%', label: 'System Uptime', labelVi: 'Uptime' },
              { value: '24', label: 'API Endpoints', labelVi: 'Endpoints' },
            ].map((stat, i) => (
              <div key={i} className="px-6 py-8 text-center bg-white dark:bg-neutral-950">
                <div className="text-2xl lg:text-3xl font-bold tracking-tight">{stat.value}</div>
                <div className="text-xs mt-1 text-zinc-500">{stat.label}</div>
                <div className="text-[10px] text-zinc-400 dark:text-neutral-600">{stat.labelVi}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FEATURES */}
      {/* ================================================================== */}

      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-xl mb-16">
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">
              Enterprise-Grade Features
            </h2>
            <p className="text-lg text-zinc-500 dark:text-neutral-500 mb-3">
              Tính năng Cấp Doanh nghiệp
            </p>
            <p className="text-base text-zinc-600 dark:text-neutral-400">
              Everything you need to manage manufacturing operations at scale
            </p>
            <p className="text-sm text-zinc-500">
              Mọi thứ bạn cần để quản lý hoạt động sản xuất quy mô lớn
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Boxes, title: 'Inventory Management', titleVi: 'Quản lý Tồn kho', desc: 'Real-time stock tracking across multiple warehouses', descVi: 'Theo dõi tồn kho thời gian thực đa kho' },
              { icon: Factory, title: 'Production Control', titleVi: 'Điều khiển Sản xuất', desc: 'Work order management with progress tracking', descVi: 'Quản lý lệnh sản xuất với theo dõi tiến độ' },
              { icon: ShieldCheck, title: 'Quality Assurance', titleVi: 'Đảm bảo Chất lượng', desc: 'NCR tracking and CAPA management', descVi: 'Theo dõi NCR và quản lý CAPA' },
              { icon: TrendingUp, title: 'Advanced Analytics', titleVi: 'Phân tích Nâng cao', desc: 'Real-time KPIs and trend analysis', descVi: 'KPIs thời gian thực và phân tích xu hướng' },
              { icon: Lock, title: 'Enterprise Security', titleVi: 'Bảo mật Doanh nghiệp', desc: 'Role-based access and audit logging', descVi: 'Phân quyền và ghi log kiểm toán' },
              { icon: Code, title: 'REST API', titleVi: 'REST API', desc: 'Complete API with webhooks', descVi: 'API đầy đủ với webhooks' },
            ].map((feat, i) => (
              <div
                key={i}
                className="group p-6 rounded-xl transition-all bg-zinc-50 dark:bg-neutral-900/50 border border-zinc-200 dark:border-neutral-800 hover:border-zinc-300 dark:hover:border-neutral-700 hover:bg-zinc-100 dark:hover:bg-neutral-900"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-zinc-200 dark:bg-neutral-800">
                  <feat.icon className="w-5 h-5 text-zinc-600 dark:text-neutral-300" />
                </div>
                <h3 className="text-sm font-semibold mb-1">{feat.title}</h3>
                <p className="text-xs text-zinc-500 dark:text-neutral-600 mb-2">{feat.titleVi}</p>
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-neutral-400">{feat.desc}</p>
                <p className="text-xs leading-relaxed text-zinc-500 dark:text-neutral-500 mt-1">{feat.descVi}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* TECH STACK */}
      {/* ================================================================== */}

      <section className="py-24 bg-zinc-50 dark:bg-neutral-900/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">
              Built with Modern Technology
            </h2>
            <p className="text-lg text-zinc-500 mb-3">Xây dựng với Công nghệ Hiện đại</p>
            <p className="text-base text-zinc-600 dark:text-neutral-400">
              Production-ready architecture using industry-leading tools
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: Zap, name: 'Next.js 14', color: 'text-yellow-500' },
              { icon: FileCode, name: 'TypeScript', color: 'text-blue-500' },
              { icon: Palette, name: 'Tailwind CSS', color: 'text-cyan-500' },
              { icon: Database, name: 'PostgreSQL', color: 'text-blue-600' },
              { icon: Server, name: 'Prisma', color: 'text-emerald-500' },
              { icon: TestTube2, name: 'Vitest', color: 'text-green-500' },
            ].map((tech, i) => (
              <div key={i} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm bg-white dark:bg-neutral-800/80 border border-zinc-200 dark:border-neutral-700/50">
                <tech.icon className={`w-4 h-4 ${tech.color}`} />
                <span className="font-medium text-zinc-700 dark:text-neutral-300">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* DOCUMENTATION */}
      {/* ================================================================== */}

      <section id="docs" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-xl mb-16">
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">
              Documentation
            </h2>
            <p className="text-lg text-zinc-500 mb-3">Tài liệu Hướng dẫn</p>
            <p className="text-base text-zinc-600 dark:text-neutral-400">
              Comprehensive guides to get you started • Hướng dẫn chi tiết để bắt đầu
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Terminal, title: 'Setup Guide', titleVi: 'Hướng dẫn Cài đặt', desc: 'Installation and configuration', descVi: 'Cài đặt và cấu hình', href: '/docs#setup' },
              { icon: Code, title: 'API Reference', titleVi: 'Tài liệu API', desc: 'REST API documentation', descVi: 'Tài liệu REST API', href: '/docs#api' },
              { icon: Network, title: 'Architecture', titleVi: 'Kiến trúc', desc: 'System design and data flow', descVi: 'Thiết kế hệ thống', href: '/docs#architecture' },
              { icon: Database, title: 'Components', titleVi: 'Thành phần', desc: 'UI component library', descVi: 'Thư viện UI', href: '/docs#components' },
            ].map((doc, i) => (
              <Link
                key={i}
                href={doc.href}
                className="group flex items-start gap-4 p-5 rounded-xl transition-all bg-zinc-50 dark:bg-neutral-900/50 border border-zinc-200 dark:border-neutral-800 hover:border-zinc-300 dark:hover:border-neutral-700"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-zinc-200 dark:bg-neutral-800">
                  <doc.icon className="w-5 h-5 text-zinc-500 dark:text-neutral-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{doc.title}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 transition-all group-hover:opacity-100 text-zinc-400" />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-neutral-600">{doc.titleVi}</p>
                  <p className="text-sm mt-1 text-zinc-600 dark:text-neutral-400">{doc.desc}</p>
                  <p className="text-xs text-zinc-500">{doc.descVi}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* API SECTION */}
      {/* ================================================================== */}

      <section id="api" className="py-24 bg-zinc-50 dark:bg-neutral-900/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">
                REST API
              </h2>
              <p className="text-lg text-zinc-500 mb-4">Giao diện Lập trình Ứng dụng</p>
              <p className="text-base mb-8 text-zinc-600 dark:text-neutral-400">
                24 endpoints with webhooks and comprehensive documentation
              </p>
              <p className="text-sm mb-8 text-zinc-500">
                24 endpoints với webhooks và tài liệu đầy đủ
              </p>

              <div className="space-y-2">
                {[
                  { method: 'GET', path: '/api/v2/dashboard' },
                  { method: 'GET', path: '/api/v2/parts' },
                  { method: 'POST', path: '/api/v2/sales' },
                  { method: 'GET', path: '/api/v2/analytics' },
                ].map((endpoint, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg font-mono text-sm bg-white dark:bg-neutral-800/50 border border-zinc-200 dark:border-transparent"
                  >
                    <span className={`text-xs font-bold ${
                      endpoint.method === 'GET' ? 'text-emerald-600 dark:text-emerald-500' : 'text-blue-600 dark:text-blue-500'
                    }`}>
                      {endpoint.method}
                    </span>
                    <span className="text-zinc-700 dark:text-neutral-300">{endpoint.path}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl overflow-hidden bg-white dark:bg-neutral-950 border border-zinc-200 dark:border-neutral-800">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-zinc-200 dark:border-neutral-800 bg-zinc-50 dark:bg-transparent">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                <span className="ml-3 text-[11px] text-zinc-500 font-mono">response.json</span>
              </div>
              <pre className="p-5 text-[13px] text-zinc-700 dark:text-neutral-300 font-mono overflow-x-auto leading-relaxed">
{`{
  "success": true,
  "data": {
    "kpis": {
      "inventory": {
        "totalParts": 1250,
        "lowStockParts": 23
      },
      "sales": {
        "totalOrders": 156,
        "monthlyRevenue": 450000
      }
    }
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* CTA - Bloomberg Style */}
      {/* ================================================================== */}

      <section className="py-24 bg-zinc-50 dark:bg-neutral-900/50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative overflow-hidden rounded-lg border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-100 dark:bg-neutral-800 border-b border-zinc-200 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-[10px] font-mono text-zinc-500 dark:text-neutral-500 uppercase tracking-wider">Get Started</span>
              <div className="w-12" />
            </div>

            {/* Content */}
            <div className="p-8 lg:p-12 text-center">
              <div className="font-mono text-xs text-zinc-500 dark:text-neutral-500 mb-4 uppercase tracking-wider">
                &gt; SYSTEM READY
              </div>

              <h2 className="text-2xl lg:text-3xl font-bold font-mono tracking-tight mb-2 text-zinc-900 dark:text-white">
                MRP<span className="text-orange-500">.</span>INIT
              </h2>

              <p className="font-mono text-sm text-zinc-600 dark:text-neutral-400 mb-8 max-w-md mx-auto">
                Initialize your manufacturing operations
                <br />
                <span className="text-zinc-400 dark:text-neutral-600">Khởi tạo hệ thống quản lý sản xuất</span>
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-mono font-medium rounded border border-orange-500 bg-orange-500 text-white hover:bg-orange-600 transition-all"
                >
                  <span className="text-orange-200">&gt;</span>
                  START SESSION
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-mono font-medium rounded border border-zinc-300 dark:border-neutral-700 text-zinc-700 dark:text-neutral-300 hover:bg-zinc-100 dark:hover:bg-neutral-800 transition-all"
                >
                  VIEW DOCS
                </Link>
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-neutral-800">
                <div className="flex items-center justify-center gap-6 font-mono text-[10px] text-zinc-400 dark:text-neutral-600">
                  <span>● SECURE</span>
                  <span>● REAL-TIME</span>
                  <span>● ENTERPRISE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FOOTER */}
      {/* ================================================================== */}

      <footer className="border-t border-zinc-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-4 text-zinc-500">Product • Sản phẩm</h4>
              <div className="space-y-3">
                {[
                  { en: 'Features', vi: 'Tính năng' },
                  { en: 'Dashboard', vi: 'Bảng điều khiển' },
                  { en: 'API', vi: 'API' },
                ].map((item) => (
                  <a key={item.en} href="#" className="block text-sm transition-colors text-zinc-600 dark:text-neutral-400 hover:text-zinc-900 dark:hover:text-white">
                    {item.en} <span className="text-zinc-400 dark:text-neutral-600">/ {item.vi}</span>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-4 text-zinc-500">Resources • Tài nguyên</h4>
              <div className="space-y-3">
                {[
                  { en: 'Documentation', vi: 'Tài liệu' },
                  { en: 'Setup Guide', vi: 'Cài đặt' },
                  { en: 'API Reference', vi: 'API' },
                ].map((item) => (
                  <a key={item.en} href="/docs" className="block text-sm transition-colors text-zinc-600 dark:text-neutral-400 hover:text-zinc-900 dark:hover:text-white">
                    {item.en}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-4 text-zinc-500">Company • Công ty</h4>
              <div className="space-y-3">
                {[
                  { en: 'About', vi: 'Giới thiệu' },
                  { en: 'Contact', vi: 'Liên hệ' },
                  { en: 'Careers', vi: 'Tuyển dụng' },
                ].map((item) => (
                  <a key={item.en} href="#" className="block text-sm transition-colors text-zinc-600 dark:text-neutral-400 hover:text-zinc-900 dark:hover:text-white">
                    {item.en}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-4 text-zinc-500">Legal • Pháp lý</h4>
              <div className="space-y-3">
                {[
                  { en: 'Privacy', vi: 'Bảo mật' },
                  { en: 'Terms', vi: 'Điều khoản' },
                  { en: 'Security', vi: 'An ninh' },
                ].map((item) => (
                  <a key={item.en} href="#" className="block text-sm transition-colors text-zinc-600 dark:text-neutral-400 hover:text-zinc-900 dark:hover:text-white">
                    {item.en}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-zinc-200 dark:border-neutral-800">
            <div className="flex items-center gap-2.5 mb-4 md:mb-0">
              <div className="w-6 h-6 rounded flex items-center justify-center bg-neutral-900 dark:bg-neutral-800">
                <span className="text-[8px] font-bold text-white font-mono">MRP</span>
              </div>
              <span className="text-xs text-zinc-500 flex items-center">© 2025 MRP<span className="w-1 h-1 rounded-full bg-orange-500 mx-0.5" />System. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 mr-2">EN/VI</span>
              <a href="#" className="w-8 h-8 flex items-center justify-center rounded-md transition-colors hover:bg-zinc-100 dark:hover:bg-neutral-800 text-zinc-500">
                <GitFork className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 flex items-center justify-center rounded-md transition-colors hover:bg-zinc-100 dark:hover:bg-neutral-800 text-zinc-500">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
