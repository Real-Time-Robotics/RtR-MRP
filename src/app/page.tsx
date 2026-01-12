// =============================================================================
// RTR MRP - LANDING PAGE (Medusa-style Design)
// Premium Vietnamese UI with modern minimalist aesthetics
// =============================================================================

import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Github,
  Boxes,
  Factory,
  BarChart3,
  Shield,
  Layers,
  Zap,
  Database,
  Globe,
  Users,
  Package,
  Workflow,
  Settings,
  LineChart,
  CheckCircle2,
  Server,
  Code2,
  Cpu,
  Plane,
  CircuitBoard,
  Cog,
  FileCheck,
} from 'lucide-react';

// =============================================================================
// LANDING HEADER
// =============================================================================

function LandingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-black rounded-md flex items-center justify-center">
              <span className="text-[10px] font-bold text-white tracking-tight">RTR</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: 'Sản phẩm', href: '#product' },
              { label: 'Giải pháp', href: '#solutions' },
              { label: 'Nhà phát triển', href: '#developers' },
              { label: 'Bảng giá', href: '#pricing' },
              { label: 'Tuyển dụng', href: '#careers', badge: true },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-4 py-2 text-[14px] font-normal text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1.5"
              >
                {item.label}
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-600 rounded">
                    Mới
                  </span>
                )}
              </a>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* GitHub Stars */}
            <a
              href="https://github.com/rtr-mrp"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span className="font-medium">2.4k</span>
            </a>

            {/* Docs Button */}
            <Link
              href="/docs"
              className="px-4 py-2 text-[14px] font-medium text-gray-700 hover:text-gray-900 border border-gray-200 rounded-lg hover:border-gray-300 transition-all"
            >
              Tài liệu
            </Link>

            {/* Get Started Button */}
            <Link
              href="/login"
              className="px-4 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all"
            >
              Bắt đầu
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

// =============================================================================
// HERO SECTION
// =============================================================================

function HeroSection() {
  return (
    <section className="pt-32 pb-16 lg:pt-40 lg:pb-24">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        {/* Hero Content */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-[42px] sm:text-[52px] lg:text-[64px] font-medium leading-[1.1] tracking-[-0.02em] text-gray-900">
            Nền tảng sản xuất
            <br />
            drone chuyên nghiệp
          </h1>
          <p className="mt-6 text-[18px] lg:text-[20px] text-gray-500 leading-relaxed max-w-2xl mx-auto">
            Hệ thống MRP hàng đầu cho sản xuất UAV công nghiệp. Quản lý BOM đa cấp,
            theo dõi linh kiện quan trọng và tuân thủ NDAA cho khách hàng chính phủ.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex items-center justify-center gap-3">
            {/* Read Docs Button */}
            <Link
              href="/docs"
              className="group flex items-center gap-2 px-5 py-3 border border-gray-200 rounded-xl hover:border-gray-300 transition-all"
            >
              <FileCheck className="w-4 h-4 text-gray-500" />
              <span className="text-[14px] font-medium text-gray-900">Tài liệu kỹ thuật</span>
            </Link>

            {/* Get Started Button */}
            <Link
              href="/login"
              className="group flex items-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all"
            >
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              <span className="text-[14px] font-medium">RTR Cloud</span>
            </Link>
          </div>
        </div>

        {/* Product Screenshot */}
        <div className="mt-16 lg:mt-20 relative">
          <div className="relative mx-auto max-w-6xl">
            {/* Main Dashboard Preview */}
            <div className="relative bg-white rounded-2xl shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
              <div className="aspect-[16/7] bg-gradient-to-br from-gray-50 to-white p-6">
                {/* Mock Dashboard UI */}
                <div className="h-full flex gap-4">
                  {/* Sidebar */}
                  <div className="w-56 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                        <span className="text-[8px] font-bold text-white">RTR</span>
                      </div>
                      <span className="text-[13px] font-semibold text-gray-900">HERA Drones</span>
                    </div>
                    <div className="space-y-1">
                      {['Tìm kiếm', 'Work Orders', 'Sản phẩm', 'Linh kiện', 'BOM'].map((item, i) => (
                        <div
                          key={item}
                          className={`px-3 py-2 rounded-lg text-[13px] ${i === 1 ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-500'}`}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-[11px] text-gray-400 mb-1">Work Order › WO-2024-0156</div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full" />
                          <span className="text-[14px] font-medium text-gray-900">HERA X8 Professional</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 text-[12px] border border-gray-200 rounded-lg text-gray-600">
                          BOM Chi tiết
                        </button>
                        <button className="px-3 py-1.5 text-[12px] bg-gray-900 text-white rounded-lg">
                          Bắt đầu sản xuất
                        </button>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Cog className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-[13px] font-medium text-gray-900">KDE7215XF Motor</div>
                            <div className="text-[11px] text-gray-500">SKU: MOT-KDE-7215</div>
                          </div>
                        </div>
                        <div className="text-[13px] font-medium">8x</div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <CircuitBoard className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <div className="text-[13px] font-medium text-gray-900">NVIDIA Jetson Orin</div>
                            <div className="text-[11px] text-gray-500">SKU: CPU-NV-ORIN</div>
                          </div>
                        </div>
                        <div className="text-[13px] font-medium">1x</div>
                      </div>
                    </div>
                  </div>

                  {/* Right Panel */}
                  <div className="w-52 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="text-[12px] font-medium text-gray-900 mb-4">Thông tin đơn hàng</div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-[11px] text-gray-400">Khách hàng</div>
                        <div className="text-[13px] text-gray-900">Bộ Quốc phòng</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-gray-400">NDAA Status</div>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                          <span className="text-[13px] text-gray-900">Compliant</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-gray-400">Trạng thái</div>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                          <span className="text-[13px] text-gray-900">Đang lắp ráp</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Settings Panel */}
            <div className="absolute -left-4 top-1/4 w-48 bg-white rounded-xl border border-gray-100 shadow-xl p-4 hidden lg:block">
              <div className="flex items-center gap-2 mb-4">
                <Plane className="w-4 h-4 text-gray-400" />
                <span className="text-[12px] font-medium text-gray-900">Dòng sản phẩm</span>
              </div>
              <div className="space-y-2 text-[11px] text-gray-500">
                {['HERA X8 Pro', 'HERA X6 Lite', 'HERA Cargo', 'HERA Survey', 'Linh kiện'].map((item) => (
                  <div key={item} className="py-1">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// PARTNERS SECTION - Infinite Marquee Animation
// =============================================================================

function PartnersSection() {
  const partners = [
    'KDE Direct',
    'NVIDIA',
    'FLIR Systems',
    'Holybro',
    'Tattu Battery',
    'Castle Creations',
    'Pixhawk',
    'Sony Semiconductor',
    'Texas Instruments',
    'Bosch Sensortec',
  ];

  return (
    <section className="py-16 border-t border-gray-100 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 mb-8">
        <p className="text-[15px] text-gray-500 text-center">
          Tin tưởng bởi các nhà cung cấp linh kiện hàng không hàng đầu thế giới
        </p>
      </div>

      {/* Marquee Container */}
      <div className="relative group">
        {/* Gradient Overlays */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        {/* Scrolling Content - Two identical rows for seamless loop */}
        <div
          className="flex gap-16 hover:[animation-play-state:paused]"
          style={{
            animation: 'scroll 25s linear infinite',
          }}
        >
          {/* First set */}
          {partners.map((partner, index) => (
            <div
              key={`first-${index}`}
              className="flex-shrink-0"
            >
              <span className="text-[18px] lg:text-[22px] font-semibold text-gray-300 hover:text-gray-500 transition-colors whitespace-nowrap tracking-tight cursor-default">
                {partner}
              </span>
            </div>
          ))}
          {/* Second set for seamless loop */}
          {partners.map((partner, index) => (
            <div
              key={`second-${index}`}
              className="flex-shrink-0"
            >
              <span className="text-[18px] lg:text-[22px] font-semibold text-gray-300 hover:text-gray-500 transition-colors whitespace-nowrap tracking-tight cursor-default">
                {partner}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// FEATURES SECTION
// =============================================================================

function FeaturesSection() {
  const features = [
    {
      title: 'BOM đa cấp cho UAV',
      description: 'Quản lý cấu trúc sản phẩm phức tạp với nhiều cấp linh kiện - từ khung, motor, ESC đến vi xử lý NVIDIA Jetson và cảm biến nhiệt FLIR.',
    },
    {
      title: 'Theo dõi linh kiện quan trọng',
      description: 'Giám sát serial number và trạng thái từng linh kiện quan trọng qua toàn bộ chuỗi cung ứng.',
    },
    {
      title: 'Tuân thủ NDAA',
      description: 'Đảm bảo tuân thủ quy định NDAA cho khách hàng chính phủ và quốc phòng.',
    },
    {
      title: 'Quản lý nhà cung cấp',
      description: 'Đánh giá và theo dõi hiệu suất nhà cung cấp linh kiện hàng không toàn cầu.',
    },
    {
      title: 'Truy xuất nguồn gốc hoàn toàn',
      description: 'Lịch sử đầy đủ từ nguyên liệu thô đến sản phẩm hoàn thiện để đáp ứng yêu cầu kiểm định.',
    },
  ];

  return (
    <section className="py-24 border-t border-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left Content */}
          <div>
            <h2 className="text-[36px] lg:text-[44px] font-medium leading-[1.15] tracking-[-0.02em] text-gray-900">
              Sản xuất drone
              <br />
              chuyên nghiệp, chuẩn quân sự
            </h2>

            <div className="mt-12 space-y-0">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`py-6 ${index !== features.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <h3 className="text-[16px] font-medium text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  {index === 0 && (
                    <p className="text-[15px] text-gray-500 leading-relaxed">
                      {feature.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Product Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-[18px] font-medium text-gray-900">HERA X8 Professional</h3>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[11px] font-medium">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    Sẵn sàng
                  </span>
                  <button className="text-gray-400 hover:text-gray-600">•••</button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Description */}
              <div className="grid grid-cols-[120px_1fr] gap-4 text-[14px]">
                <span className="text-gray-500">Mô tả</span>
                <span className="text-gray-900">Heavy-lift octocopter chuyên nghiệp với AI tích hợp. Payload 15kg, thời gian bay 45 phút.</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4 text-[14px]">
                <span className="text-gray-500">Giá bán</span>
                <span className="text-gray-900 font-semibold">$28,500</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4 text-[14px]">
                <span className="text-gray-500">SKU</span>
                <span className="text-gray-900 font-mono text-[13px]">HERA-X8-PRO-2024</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4 text-[14px]">
                <span className="text-gray-500">NDAA</span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Compliant
                </span>
              </div>

              {/* BOM Summary */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[14px] font-medium text-gray-900">Linh kiện chính</span>
                  <button className="text-gray-400 hover:text-gray-600">•••</button>
                </div>
                <div className="space-y-2">
                  {[
                    { name: 'KDE7215XF Motor', qty: '8x' },
                    { name: 'Castle Creations ESC', qty: '8x' },
                    { name: 'NVIDIA Jetson Orin', qty: '1x' },
                    { name: 'FLIR Boson Thermal', qty: '1x' },
                  ].map((item) => (
                    <div key={item.name} className="flex justify-between text-[13px]">
                      <span className="text-gray-600">{item.name}</span>
                      <span className="text-gray-900 font-medium">{item.qty}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configurations */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[14px] font-medium text-gray-900">Cấu hình</span>
                  <button className="text-gray-400 hover:text-gray-600">•••</button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-[14px] text-gray-500 w-20">Camera</span>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-gray-100 rounded text-[13px] text-gray-700">Thermal</span>
                      <span className="px-3 py-1 bg-gray-100 rounded text-[13px] text-gray-700">RGB 4K</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[14px] text-gray-500 w-20">Payload</span>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-gray-100 rounded text-[13px] text-gray-700">Survey</span>
                      <span className="px-3 py-1 bg-gray-100 rounded text-[13px] text-gray-700">Cargo</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// PLATFORM SECTION - Drone Architecture
// =============================================================================

function PlatformSection() {
  const systemLayers = [
    { name: 'FINISHED GOODS', desc: 'Drone hoàn thiện' },
    { name: 'SUB-ASSEMBLIES', desc: 'Cụm lắp ráp' },
    { name: 'COMPONENTS', desc: 'Linh kiện điện tử' },
    { name: 'RAW MATERIALS', desc: 'Nguyên vật liệu' },
    { name: 'SUPPLIERS', desc: 'Nhà cung cấp' },
  ];

  return (
    <section className="py-24 border-t border-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          <div>
            <div className="flex items-center gap-2 text-[14px] text-gray-500 mb-4">
              <Layers className="w-4 h-4" />
              <span>Kiến trúc hệ thống</span>
            </div>
            <h2 className="text-[36px] lg:text-[44px] font-medium leading-[1.15] tracking-[-0.02em] text-gray-900">
              Nền tảng sản xuất UAV
              <br />
              hoàn toàn tùy biến
            </h2>
          </div>
          <div className="lg:pt-12">
            <p className="text-[17px] text-gray-500 leading-relaxed">
              Từ quản lý BOM đa cấp đến theo dõi linh kiện - hệ thống được thiết kế
              cho độ phức tạp của sản xuất drone chuyên nghiệp.
            </p>
          </div>
        </div>

        {/* Platform Illustration - Light Technical Diagram */}
        <div className="bg-white rounded-3xl p-8 lg:p-12 overflow-hidden border border-gray-200 shadow-sm">
          <div className="grid lg:grid-cols-[200px_1fr_200px] gap-6 items-start">
            {/* Left - BOM Hierarchy */}
            <div className="hidden lg:block">
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-4">BOM STRUCTURE</div>
              <div className="space-y-1">
                {systemLayers.map((layer, i) => (
                  <div key={layer.name} className="flex items-center gap-2 py-2 border-l-2 border-gray-200 pl-3" style={{ marginLeft: i * 12 }}>
                    <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                    <div>
                      <div className="text-[10px] font-mono text-gray-600 font-medium">{layer.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Center - Technical Schematic */}
            <div className="relative">
              {/* Title Bar */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">DRAWING NO. HERA-X8-001-REV.C</div>
                  <div className="text-[18px] font-medium text-gray-900 tracking-tight mt-1">HERA X8 Professional UAV</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-gray-400">SCALE 1:25</div>
                  <div className="text-[10px] font-mono text-emerald-600 font-medium">APPROVED</div>
                </div>
              </div>

              {/* Technical Drawing Area */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <svg viewBox="0 0 600 320" className="w-full h-auto">
                  {/* Fine grid */}
                  <defs>
                    <pattern id="techGridLight" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
                    </pattern>
                    <pattern id="techGridLargeLight" width="100" height="100" patternUnits="userSpaceOnUse">
                      <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#d1d5db" strokeWidth="0.75"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#techGridLight)"/>
                  <rect width="100%" height="100%" fill="url(#techGridLargeLight)"/>

                  {/* Center crosshair */}
                  <line x1="300" y1="0" x2="300" y2="320" stroke="#d1d5db" strokeWidth="0.5" strokeDasharray="4 4"/>
                  <line x1="0" y1="160" x2="600" y2="160" stroke="#d1d5db" strokeWidth="0.5" strokeDasharray="4 4"/>

                  {/* Main Frame - Precise technical drawing */}
                  <g>
                    {/* Center plate - top view */}
                    <rect x="260" y="130" width="80" height="60" rx="4" fill="white" stroke="#1e40af" strokeWidth="1.5"/>
                    <rect x="270" y="140" width="60" height="40" rx="2" fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 3"/>

                    {/* Arms - 8 directions */}
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                      const rad = (angle * Math.PI) / 180;
                      const cx = 300, cy = 160;
                      const innerR = 55;
                      const outerR = 130;
                      const x1 = cx + Math.cos(rad) * innerR;
                      const y1 = cy + Math.sin(rad) * innerR;
                      const x2 = cx + Math.cos(rad) * outerR;
                      const y2 = cy + Math.sin(rad) * outerR;

                      return (
                        <g key={i}>
                          {/* Arm structure */}
                          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1e40af" strokeWidth="2"/>
                          {/* Motor position */}
                          <circle cx={x2} cy={y2} r="18" fill="white" stroke="#1e40af" strokeWidth="1.5"/>
                          <circle cx={x2} cy={y2} r="8" fill="none" stroke="#3b82f6" strokeWidth="1"/>
                          <circle cx={x2} cy={y2} r="3" fill="#1e40af"/>
                          {/* Prop arc indicator */}
                          <circle cx={x2} cy={y2} r="28" fill="none" stroke="#93c5fd" strokeWidth="1" strokeDasharray="6 6"/>
                        </g>
                      );
                    })}

                    {/* Internal components */}
                    <rect x="285" y="148" width="30" height="12" fill="#ecfdf5" stroke="#059669" strokeWidth="1"/>
                    <text x="300" y="157" textAnchor="middle" fill="#059669" fontSize="6" fontFamily="monospace" fontWeight="600">FCU</text>

                    <rect x="285" y="162" width="30" height="10" fill="#fef3c7" stroke="#d97706" strokeWidth="1"/>
                    <text x="300" y="170" textAnchor="middle" fill="#d97706" fontSize="5" fontFamily="monospace" fontWeight="600">GPS</text>
                  </g>

                  {/* Dimension lines */}
                  <g stroke="#6b7280" strokeWidth="0.75" fill="#374151" fontSize="9" fontFamily="monospace" fontWeight="500">
                    {/* Width dimension */}
                    <line x1="170" y1="30" x2="430" y2="30"/>
                    <line x1="170" y1="24" x2="170" y2="36"/>
                    <line x1="430" y1="24" x2="430" y2="36"/>
                    <line x1="170" y1="30" x2="170" y2="70" strokeDasharray="2 2" opacity="0.4"/>
                    <line x1="430" y1="30" x2="430" y2="70" strokeDasharray="2 2" opacity="0.4"/>
                    <text x="300" y="24" textAnchor="middle">1200mm</text>

                    {/* Height dimension */}
                    <line x1="560" y1="70" x2="560" y2="250"/>
                    <line x1="554" y1="70" x2="566" y2="70"/>
                    <line x1="554" y1="250" x2="566" y2="250"/>
                    <text x="576" y="165" textAnchor="middle" transform="rotate(90 576 165)">1200mm</text>
                  </g>

                  {/* Callouts */}
                  <g fontSize="8" fontFamily="monospace">
                    <line x1="390" y1="100" x2="450" y2="60" stroke="#9ca3af" strokeWidth="0.75"/>
                    <circle cx="390" cy="100" r="2" fill="#1e40af"/>
                    <text x="455" y="56" fill="#111827" fontWeight="600">KDE7215XF-135 MOTOR (×8)</text>
                    <text x="455" y="68" fill="#6b7280">135KV • 7.2kW PEAK</text>

                    <line x1="340" y1="155" x2="450" y2="120" stroke="#9ca3af" strokeWidth="0.75"/>
                    <circle cx="340" cy="155" r="2" fill="#059669"/>
                    <text x="455" y="116" fill="#111827" fontWeight="600">PIXHAWK 6X FCU</text>
                    <text x="455" y="128" fill="#6b7280">TRIPLE REDUNDANCY</text>

                    <line x1="300" y1="200" x2="450" y2="240" stroke="#9ca3af" strokeWidth="0.75"/>
                    <circle cx="300" cy="200" r="2" fill="#7c3aed"/>
                    <text x="455" y="236" fill="#111827" fontWeight="600">NVIDIA JETSON ORIN</text>
                    <text x="455" y="248" fill="#6b7280">275 TOPS AI COMPUTE</text>
                  </g>

                  {/* Drawing border */}
                  <rect x="2" y="2" width="596" height="316" fill="none" stroke="#d1d5db" strokeWidth="1.5"/>
                </svg>
              </div>

              {/* Bottom specs bar */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 text-[10px] font-mono">
                <div className="flex gap-6">
                  <span className="text-gray-400">MATERIAL: <span className="text-gray-600 font-medium">CF/AL 7075-T6</span></span>
                  <span className="text-gray-400">TOLERANCE: <span className="text-gray-600 font-medium">±0.5mm</span></span>
                </div>
                <div className="flex gap-6">
                  <span className="text-gray-400">WEIGHT: <span className="text-gray-600 font-medium">12.4 kg</span></span>
                  <span className="text-emerald-600 font-medium">NDAA §889 COMPLIANT</span>
                </div>
              </div>
            </div>

            {/* Right - Specifications */}
            <div className="hidden lg:block">
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-4">SPECIFICATIONS</div>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-[9px] text-gray-400 uppercase tracking-wider">Max Payload</div>
                  <div className="text-[20px] font-semibold text-gray-900">15 <span className="text-[12px] text-gray-400 font-normal">kg</span></div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-[9px] text-gray-400 uppercase tracking-wider">Flight Time</div>
                  <div className="text-[20px] font-semibold text-gray-900">45 <span className="text-[12px] text-gray-400 font-normal">min</span></div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-[9px] text-gray-400 uppercase tracking-wider">Max Speed</div>
                  <div className="text-[20px] font-semibold text-gray-900">72 <span className="text-[12px] text-gray-400 font-normal">km/h</span></div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-[9px] text-gray-400 uppercase tracking-wider">BOM Items</div>
                  <div className="text-[20px] font-semibold text-gray-900">847</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="text-[9px] text-emerald-600 uppercase tracking-wider font-medium">Compliance</div>
                  <div className="text-[14px] font-semibold text-emerald-700">NDAA • ITAR</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mt-12">
          {[
            { icon: Boxes, title: 'BOM Manager', desc: 'Quản lý BOM đa cấp phức tạp.' },
            { icon: Package, title: 'Inventory', desc: 'Theo dõi linh kiện realtime.' },
            { icon: Factory, title: 'Production', desc: 'Work orders và lắp ráp.' },
            { icon: Shield, title: 'Compliance', desc: 'NDAA và truy xuất nguồn gốc.' },
            { icon: BarChart3, title: 'Analytics', desc: 'Báo cáo và dự báo thông minh.' },
          ].map((item) => (
            <div key={item.title} className="p-4">
              <item.icon className="w-5 h-5 text-gray-400 mb-3" />
              <h3 className="text-[14px] font-medium text-gray-900 mb-1">{item.title}</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// FRAMEWORK SECTION
// =============================================================================

function FrameworkSection() {
  const tabs = ['BOM & Cấu trúc', 'Work Orders', 'Inventory', 'QC & Testing', 'Báo cáo'];

  return (
    <section className="py-24 border-t border-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-0">
          {/* Left - Drone Blueprint Illustration (Light Theme) */}
          <div className="bg-gray-50 rounded-l-3xl p-8 lg:p-12 flex items-center justify-center min-h-[500px] border border-gray-200 border-r-0">
            <div className="relative w-full max-w-md">
              {/* Blueprint Grid Background */}
              <div className="absolute inset-0">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="gridLight" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#gridLight)" />
                </svg>
              </div>

              {/* Scan Line Animation */}
              <div
                className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-60 z-20"
                style={{
                  animation: 'scan 3s linear infinite',
                }}
              />

              {/* Drone Blueprint SVG */}
              <svg viewBox="0 0 400 300" className="w-full h-auto relative z-10">
                {/* Center Body */}
                <ellipse cx="200" cy="150" rx="45" ry="25" fill="white" stroke="#1e40af" strokeWidth="2" />
                <ellipse cx="200" cy="150" rx="35" ry="18" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 4" />

                {/* Arms - 8 arms for octocopter */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                  const rad = (angle * Math.PI) / 180;
                  const x1 = 200 + Math.cos(rad) * 45;
                  const y1 = 150 + Math.sin(rad) * 25;
                  const x2 = 200 + Math.cos(rad) * 120;
                  const y2 = 150 + Math.sin(rad) * 70;
                  return (
                    <g key={i}>
                      {/* Arm */}
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1e40af" strokeWidth="2.5" />
                      {/* Motor mount */}
                      <circle cx={x2} cy={y2} r="10" fill="white" stroke="#1e40af" strokeWidth="2" />
                      <circle cx={x2} cy={y2} r="4" fill="#1e40af" />
                      {/* Propeller circle */}
                      <circle cx={x2} cy={y2} r="25" fill="none" stroke="#93c5fd" strokeWidth="1" strokeDasharray="5 5" />
                    </g>
                  );
                })}

                {/* Center details */}
                <rect x="182" y="138" width="36" height="24" rx="4" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5" />
                <text x="200" y="153" textAnchor="middle" fill="#059669" fontSize="7" fontFamily="monospace" fontWeight="600">FCU</text>

                {/* Camera gimbal */}
                <rect x="188" y="168" width="24" height="14" rx="3" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                <circle cx="200" cy="175" r="4" fill="none" stroke="#d97706" strokeWidth="1" />

                {/* Dimension lines */}
                <line x1="80" y1="65" x2="320" y2="65" stroke="#6b7280" strokeWidth="1" />
                <line x1="80" y1="58" x2="80" y2="72" stroke="#6b7280" strokeWidth="1" />
                <line x1="320" y1="58" x2="320" y2="72" stroke="#6b7280" strokeWidth="1" />
                <text x="200" y="58" textAnchor="middle" fill="#374151" fontSize="9" fontFamily="monospace" fontWeight="600">1200mm</text>

                {/* Labels */}
                <text x="200" y="25" textAnchor="middle" fill="#111827" fontSize="12" fontFamily="monospace" fontWeight="700">HERA X8 PROFESSIONAL</text>
                <text x="200" y="40" textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="monospace">OCTOCOPTER • TOP VIEW</text>

                {/* Specs - Left */}
                <g fill="#374151" fontSize="8" fontFamily="monospace">
                  <text x="25" y="245" fontWeight="600">PAYLOAD</text>
                  <text x="25" y="257" fill="#6b7280">15 kg max</text>
                  <text x="25" y="275" fontWeight="600">FLIGHT TIME</text>
                  <text x="25" y="287" fill="#6b7280">45 min</text>
                </g>

                {/* Specs - Right */}
                <g fill="#374151" fontSize="8" fontFamily="monospace" textAnchor="end">
                  <text x="375" y="245" fontWeight="600">MOTORS</text>
                  <text x="375" y="257" fill="#6b7280">KDE7215XF ×8</text>
                  <text x="375" y="275" fill="#059669" fontWeight="600">NDAA COMPLIANT</text>
                  <text x="375" y="287" fill="#6b7280">§889 Certified</text>
                </g>

                {/* Corner markers */}
                <path d="M 15 25 L 15 15 L 25 15" fill="none" stroke="#1e40af" strokeWidth="1.5" />
                <path d="M 375 25 L 385 25 L 385 15" fill="none" stroke="#1e40af" strokeWidth="1.5" />
                <path d="M 15 275 L 15 285 L 25 285" fill="none" stroke="#1e40af" strokeWidth="1.5" />
                <path d="M 375 285 L 385 285 L 385 275" fill="none" stroke="#1e40af" strokeWidth="1.5" />

                {/* Border */}
                <rect x="10" y="10" width="380" height="280" fill="none" stroke="#d1d5db" strokeWidth="1" rx="4" />
              </svg>
            </div>
          </div>

          {/* Right - Content */}
          <div className="bg-white rounded-r-3xl p-12 lg:p-16 border border-l-0 border-gray-100">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-12">
              {tabs.map((tab, i) => (
                <button
                  key={tab}
                  className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
                    i === 0
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex items-center gap-2 text-[14px] text-gray-500 mb-4">
              <Workflow className="w-4 h-4" />
              <span>Quy trình sản xuất</span>
            </div>
            <h2 className="text-[32px] lg:text-[40px] font-medium leading-[1.15] tracking-[-0.02em] text-gray-900 mb-6">
              Tùy biến mọi
              <br />
              quy trình sản xuất
            </h2>
            <p className="text-[16px] text-gray-500 leading-relaxed mb-8">
              Hệ thống linh hoạt cho phép bạn tùy chỉnh quy trình sản xuất drone
              theo yêu cầu riêng. Từ quản lý BOM, work orders, kiểm tra chất lượng
              đến truy xuất nguồn gốc hoàn toàn.
            </p>
            <a href="#" className="inline-flex items-center gap-2 text-[15px] font-medium text-blue-600 hover:text-blue-700">
              Xem tài liệu kỹ thuật
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// STATS SECTION
// =============================================================================

function StatsSection() {
  const stats = [
    { icon: Plane, value: '500+', label: 'Drone đã sản xuất' },
    { icon: Package, value: '15,000+', label: 'Linh kiện được theo dõi' },
    { icon: Shield, value: '100%', label: 'Tuân thủ NDAA' },
    { icon: Users, value: '50+', label: 'Khách hàng chính phủ & doanh nghiệp' },
  ];

  return (
    <section className="py-16 border-t border-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4 text-gray-400" />
                <span className="text-[24px] lg:text-[28px] font-medium text-gray-900">{stat.value}</span>
              </div>
              <p className="text-[14px] text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// CTA SECTION
// =============================================================================

function CTASection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          <h2 className="text-[28px] lg:text-[36px] font-medium leading-[1.2] tracking-[-0.02em] text-gray-900">
            Sẵn sàng nâng cấp quy trình
            <br />
            sản xuất drone của bạn?
          </h2>
          <div className="flex items-center gap-3">
            <Link
              href="/docs"
              className="px-5 py-3 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-lg hover:border-gray-300 transition-all"
            >
              Xem tài liệu
            </Link>
            <Link
              href="/login"
              className="px-5 py-3 text-[14px] font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all"
            >
              Đăng ký demo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// FOOTER
// =============================================================================

function Footer() {
  const footerLinks = {
    'Sản phẩm': ['BOM Manager', 'Inventory', 'Production', 'Quality Control', 'Analytics', 'API'],
    'Giải pháp': ['Quốc phòng', 'Nông nghiệp', 'Năng lượng', 'Khảo sát', 'Vận tải'],
    'Tài nguyên': ['Tài liệu', 'Hướng dẫn', 'Case Studies', 'Blog', 'Hỗ trợ'],
    'Công ty': ['Về chúng tôi', 'Đối tác', 'Tuyển dụng', 'Liên hệ'],
  };

  return (
    <footer className="py-16 border-t border-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Logo */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-7 h-7 bg-black rounded-md flex items-center justify-center">
                <span className="text-[10px] font-bold text-white tracking-tight">RTR</span>
              </div>
            </Link>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-[14px] font-medium text-gray-900 mb-4">{title}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-[14px] text-gray-500 hover:text-gray-900 transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter */}
          <div>
            <h3 className="text-[14px] font-medium text-gray-900 mb-4">Bản tin</h3>
            <div className="flex">
              <input
                type="email"
                placeholder="Email của bạn"
                className="flex-1 px-3 py-2 text-[14px] border border-gray-200 rounded-l-lg focus:outline-none focus:border-gray-300"
              />
              <button className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-l-0 border-gray-200 rounded-r-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
                Đăng ký
              </button>
            </div>
            <p className="mt-3 text-[12px] text-gray-400 leading-relaxed">
              Nhận tin tức sản phẩm mới nhất. Hủy đăng ký bất cứ lúc nào.
            </p>

            {/* Social */}
            <div className="flex items-center gap-4 mt-6">
              {['Discord', 'X', 'LinkedIn', 'GitHub'].map((social) => (
                <a key={social} href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <span className="text-[12px]">{social[0]}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[13px] text-gray-400">
            © 2024 RTR MRP. Đã đăng ký bản quyền.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[13px] text-gray-400 hover:text-gray-600">Điều khoản</a>
            <a href="#" className="text-[13px] text-gray-400 hover:text-gray-600">Bảo mật</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      <LandingHeader />
      <main>
        <HeroSection />
        <PartnersSection />
        <FeaturesSection />
        <PlatformSection />
        <FrameworkSection />
        <StatsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
