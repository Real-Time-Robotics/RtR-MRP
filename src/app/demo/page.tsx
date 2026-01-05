'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Crown,
  Briefcase,
  Wrench,
  Eye,
  ArrowRight,
  Check,
  Moon,
  Sun,
  Globe,
  LogIn,
  Loader2,
  Sparkles,
  Shield,
  Zap,
} from 'lucide-react';

// =============================================================================
// DEMO CREDENTIALS
// =============================================================================

const DEMO_CREDENTIALS = {
  admin: {
    email: 'admin@demo.rtr-mrp.com',
    password: 'Admin@Demo2026!',
  },
  manager: {
    email: 'manager@demo.rtr-mrp.com',
    password: 'Manager@Demo2026!',
  },
  operator: {
    email: 'operator@demo.rtr-mrp.com',
    password: 'Operator@Demo2026!',
  },
  viewer: {
    email: 'viewer@demo.rtr-mrp.com',
    password: 'Viewer@Demo2026!',
  },
};

// =============================================================================
// ROLE DEFINITIONS - Premium Design
// =============================================================================

type Role = 'admin' | 'manager' | 'operator' | 'viewer';

interface RoleInfo {
  key: Role;
  title: string;
  titleVi: string;
  description: string;
  descriptionVi: string;
  icon: React.ElementType;
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
  iconBg: string;
  badge: string;
  features: string[];
  featuresVi: string[];
}

const roles: RoleInfo[] = [
  {
    key: 'admin',
    title: 'Administrator',
    titleVi: 'Quản trị viên',
    description: 'Full system access and user management',
    descriptionVi: 'Toàn quyền hệ thống và quản lý người dùng',
    icon: Crown,
    accentColor: 'amber',
    gradientFrom: 'from-amber-500/20',
    gradientTo: 'to-orange-500/10',
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
    badge: 'FULL ACCESS',
    features: ['Full CRUD all modules', 'User management', 'System settings', 'All approvals'],
    featuresVi: ['CRUD toàn bộ modules', 'Quản lý người dùng', 'Cài đặt hệ thống', 'Duyệt tất cả'],
  },
  {
    key: 'manager',
    title: 'Manager',
    titleVi: 'Quản lý',
    description: 'Operations management and approvals',
    descriptionVi: 'Quản lý vận hành và phê duyệt',
    icon: Briefcase,
    accentColor: 'blue',
    gradientFrom: 'from-blue-500/20',
    gradientTo: 'to-indigo-500/10',
    iconBg: 'bg-gradient-to-br from-blue-400 to-indigo-500',
    badge: 'MANAGEMENT',
    features: ['Create & edit orders', 'Approve requests', 'Run MRP', 'Export reports'],
    featuresVi: ['Tạo & sửa đơn hàng', 'Duyệt yêu cầu', 'Chạy MRP', 'Xuất báo cáo'],
  },
  {
    key: 'operator',
    title: 'Operator',
    titleVi: 'Nhân viên',
    description: 'Daily operations and data entry',
    descriptionVi: 'Thao tác hàng ngày và nhập liệu',
    icon: Wrench,
    accentColor: 'emerald',
    gradientFrom: 'from-emerald-500/20',
    gradientTo: 'to-teal-500/10',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500',
    badge: 'OPERATIONS',
    features: ['Create work orders', 'Update inventory', 'QC recording', 'View reports'],
    featuresVi: ['Tạo lệnh sản xuất', 'Cập nhật tồn kho', 'Ghi nhận QC', 'Xem báo cáo'],
  },
  {
    key: 'viewer',
    title: 'Viewer',
    titleVi: 'Người xem',
    description: 'Read-only access to all data',
    descriptionVi: 'Chỉ xem dữ liệu, không thao tác',
    icon: Eye,
    accentColor: 'slate',
    gradientFrom: 'from-slate-500/20',
    gradientTo: 'to-zinc-500/10',
    iconBg: 'bg-gradient-to-br from-slate-400 to-zinc-500',
    badge: 'READ ONLY',
    features: ['View dashboard', 'View all modules', 'No create/edit', 'No approvals'],
    featuresVi: ['Xem dashboard', 'Xem tất cả modules', 'Không tạo/sửa', 'Không duyệt'],
  },
];

// =============================================================================
// PERMISSION TABLE DATA
// =============================================================================

const permissionTable = [
  { module: 'Dashboard', admin: 'Full', manager: 'Full', operator: 'View', viewer: 'View' },
  { module: 'Orders', admin: 'CRUD', manager: 'CRU+A', operator: 'CR', viewer: 'R' },
  { module: 'Inventory', admin: 'Full', manager: 'Full', operator: 'R+Adj', viewer: 'R' },
  { module: 'Production', admin: 'CRUD', manager: 'CRUD', operator: 'CRUD', viewer: 'R' },
  { module: 'Quality', admin: 'CRUD', manager: 'CRU', operator: 'CRU', viewer: 'R' },
  { module: 'MRP', admin: 'Full', manager: 'Full', operator: 'R+Run', viewer: 'R' },
  { module: 'Reports', admin: 'Full', manager: 'Full', operator: 'R+Exp', viewer: 'R' },
  { module: 'Users', admin: 'CRUD', manager: 'R', operator: '-', viewer: '-' },
  { module: 'Settings', admin: 'RW', manager: 'R', operator: '-', viewer: '-' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export default function DemoPage() {
  const router = useRouter();
  const { status } = useSession();
  const [loading, setLoading] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState<'en' | 'vi'>('vi');
  const [hoveredRole, setHoveredRole] = useState<Role | null>(null);

  // Load dark mode preference
  useEffect(() => {
    const saved = localStorage.getItem('dark-mode');
    if (saved === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/home');
    }
  }, [status, router]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('dark-mode', String(!darkMode));
    document.documentElement.classList.toggle('dark', !darkMode);
  };

  const handleQuickLogin = async (role: Role) => {
    setLoading(role);
    setError(null);

    try {
      const creds = DEMO_CREDENTIALS[role];
      const result = await signIn('credentials', {
        redirect: false,
        email: creds.email,
        password: creds.password,
      });

      if (result?.error) {
        setError('Login failed. Please try again.');
      } else if (result?.ok) {
        router.push('/home');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(null);
    }
  };

  const t = (en: string, vi: string) => (lang === 'en' ? en : vi);

  if (status === 'loading') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-neutral-950' : 'bg-slate-50'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <p className={`text-sm font-medium ${darkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'dark' : ''}`}>
      {/* Background - Premium gradient (dark/light) */}
      <div className={`fixed inset-0 transition-colors duration-300 ${
        darkMode
          ? 'bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950'
          : 'bg-gradient-to-b from-slate-50 via-white to-slate-100'
      }`} />

      {/* Subtle grid pattern overlay */}
      <div
        className={`fixed inset-0 ${darkMode ? 'opacity-[0.03]' : 'opacity-[0.5]'}`}
        style={{
          backgroundImage: darkMode
            ? `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
               linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`
            : `linear-gradient(rgba(148,163,184,0.1) 1px, transparent 1px),
               linear-gradient(90deg, rgba(148,163,184,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Ambient glow effects */}
      <div className={`fixed top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] ${
        darkMode ? 'bg-amber-500/5' : 'bg-amber-500/10'
      }`} />
      <div className={`fixed bottom-0 right-1/4 w-96 h-96 rounded-full blur-[120px] ${
        darkMode ? 'bg-blue-500/5' : 'bg-blue-500/10'
      }`} />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-colors ${
          darkMode
            ? 'bg-neutral-950/80 border-neutral-800/50'
            : 'bg-white/80 border-slate-200/50'
        }`}>
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shadow-lg transition-colors ${
                darkMode
                  ? 'bg-neutral-800 border border-neutral-700 shadow-black/20 group-hover:border-amber-500/50'
                  : 'bg-slate-800 border border-slate-700 shadow-slate-200 group-hover:border-amber-500/50'
              }`}>
                <span className="text-white font-bold text-sm font-mono">MRP</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-bold text-lg font-mono tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  RTR-MRP
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 ml-0.5 mb-1" />
                </span>
                <span className={`px-2.5 py-1 text-xs rounded-full font-medium border ${
                  darkMode
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-amber-50 text-amber-600 border-amber-200'
                }`}>
                  Demo
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
                className={`p-2.5 rounded-lg border transition-all ${
                  darkMode
                    ? 'bg-neutral-800/50 hover:bg-neutral-800 border-neutral-700/50 hover:border-neutral-600'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 hover:border-slate-300'
                }`}
                title={lang === 'en' ? 'Switch to Vietnamese' : 'Switch to English'}
              >
                <Globe className={`w-4 h-4 ${darkMode ? 'text-neutral-400' : 'text-slate-500'}`} />
              </button>
              <button
                onClick={toggleDarkMode}
                className={`p-2.5 rounded-lg border transition-all ${
                  darkMode
                    ? 'bg-neutral-800/50 hover:bg-neutral-800 border-neutral-700/50 hover:border-neutral-600'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 hover:border-slate-300'
                }`}
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600" />
                )}
              </button>
              <Link
                href="/login"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ml-2 ${
                  darkMode
                    ? 'bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">{t('Sign In', 'Đăng nhập')}</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-16 md:py-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            {/* Status Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 backdrop-blur-sm border rounded-full text-sm mb-8 ${
              darkMode
                ? 'bg-neutral-800/50 border-neutral-700/50'
                : 'bg-white/80 border-slate-200 shadow-sm'
            }`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className={darkMode ? 'text-neutral-300' : 'text-slate-600'}>{t('Demo Environment', 'Môi trường Demo')}</span>
              <span className={darkMode ? 'text-neutral-500' : 'text-slate-400'}>•</span>
              <span className="text-emerald-500">{t('Live', 'Đang hoạt động')}</span>
            </div>

            {/* Main Heading */}
            <h1 className={`text-4xl md:text-6xl font-bold mb-6 tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {t('Experience', 'Trải nghiệm')}{' '}
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
                RTR-MRP
              </span>
            </h1>

            <p className={`text-lg md:text-xl max-w-2xl mx-auto leading-relaxed ${darkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
              {t(
                'Select a role to explore our enterprise MRP system with different permission levels',
                'Chọn vai trò để khám phá hệ thống MRP doanh nghiệp với các cấp quyền khác nhau'
              )}
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {[
                { icon: Shield, text: t('Role-Based Access', 'Phân quyền theo vai trò') },
                { icon: Zap, text: t('Real-Time Data', 'Dữ liệu thời gian thực') },
                { icon: Sparkles, text: t('AI-Powered', 'Tích hợp AI') },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-full text-sm ${
                    darkMode
                      ? 'bg-neutral-800/30 border-neutral-700/30 text-neutral-400'
                      : 'bg-white/80 border-slate-200 text-slate-600 shadow-sm'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${darkMode ? 'text-amber-500/70' : 'text-amber-500'}`} />
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Error Message */}
        {error && (
          <div className="max-w-4xl mx-auto px-6 mb-8">
            <div className={`backdrop-blur-sm rounded-xl p-4 text-center ${
              darkMode
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              {error}
            </div>
          </div>
        )}

        {/* Role Cards - Premium Grid */}
        <section className="py-8 px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {roles.map((role) => (
              <div
                key={role.key}
                onMouseEnter={() => setHoveredRole(role.key)}
                onMouseLeave={() => setHoveredRole(null)}
                className={`
                  group relative rounded-2xl overflow-hidden
                  backdrop-blur-sm transition-all duration-500 ease-out
                  ${darkMode
                    ? 'bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700'
                    : 'bg-white/80 border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-xl'
                  }
                  ${hoveredRole === role.key
                    ? darkMode
                      ? 'shadow-2xl shadow-black/50 scale-[1.02]'
                      : 'shadow-2xl shadow-slate-200/50 scale-[1.02]'
                    : ''
                  }
                `}
              >
                {/* Gradient overlay on hover */}
                <div className={`
                  absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500
                  bg-gradient-to-br ${role.gradientFrom} ${role.gradientTo}
                `} />

                {/* Card Content */}
                <div className="relative p-6 md:p-8">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className={`
                        w-14 h-14 rounded-xl ${role.iconBg}
                        flex items-center justify-center shadow-lg
                        group-hover:scale-110 transition-transform duration-300
                      `}>
                        <role.icon className="w-7 h-7 text-white" />
                      </div>

                      <div>
                        <h3 className={`text-xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {lang === 'en' ? role.title : role.titleVi}
                        </h3>
                        <p className={`text-sm mt-0.5 ${darkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                          {lang === 'en' ? role.description : role.descriptionVi}
                        </p>
                      </div>
                    </div>

                    {/* Badge */}
                    <span className={`
                      px-3 py-1 text-[10px] font-bold tracking-wider rounded-full
                      ${role.key === 'admin'
                        ? darkMode
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-amber-50 text-amber-600 border border-amber-200'
                        : role.key === 'manager'
                        ? darkMode
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-blue-50 text-blue-600 border border-blue-200'
                        : role.key === 'operator'
                        ? darkMode
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : darkMode
                          ? 'bg-neutral-700/50 text-neutral-400 border border-neutral-600/30'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }
                    `}>
                      {role.badge}
                    </span>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-3 mb-8">
                    {(lang === 'en' ? role.features : role.featuresVi).map((feature, idx) => (
                      <li
                        key={idx}
                        className={`flex items-center gap-3 text-sm transition-colors ${
                          darkMode ? 'text-neutral-400 group-hover:text-neutral-300' : 'text-slate-600'
                        }`}
                      >
                        <div className={`
                          w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                          ${role.key === 'admin'
                            ? darkMode ? 'bg-amber-500/20' : 'bg-amber-100'
                            : role.key === 'manager'
                            ? darkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                            : role.key === 'operator'
                            ? darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'
                            : darkMode ? 'bg-neutral-700/50' : 'bg-slate-100'
                          }
                        `}>
                          <Check className={`w-3 h-3
                            ${role.key === 'admin'
                              ? darkMode ? 'text-amber-400' : 'text-amber-600'
                              : role.key === 'manager'
                              ? darkMode ? 'text-blue-400' : 'text-blue-600'
                              : role.key === 'operator'
                              ? darkMode ? 'text-emerald-400' : 'text-emerald-600'
                              : darkMode ? 'text-neutral-400' : 'text-slate-500'
                            }
                          `} />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Action Button */}
                  <button
                    onClick={() => handleQuickLogin(role.key)}
                    disabled={loading !== null}
                    className={`
                      w-full py-3.5 px-6 rounded-xl font-semibold text-sm
                      transition-all duration-300 flex items-center justify-center gap-2
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${role.key === 'admin'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/25'
                        : role.key === 'manager'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white shadow-lg shadow-blue-500/25'
                        : role.key === 'operator'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/25'
                        : darkMode
                          ? 'bg-neutral-700 hover:bg-neutral-600 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-white'
                      }
                    `}
                  >
                    {loading === role.key ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {t('Continue as', 'Tiếp tục với')} {lang === 'en' ? role.title : role.titleVi}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  {/* Credentials - Subtle footer */}
                  <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-neutral-800/50' : 'border-slate-200/50'}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className={darkMode ? 'text-neutral-600' : 'text-slate-400'}>Demo Account</span>
                      <code className={`font-mono ${darkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                        {DEMO_CREDENTIALS[role.key].email.split('@')[0]}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Permission Comparison Table - Premium Style */}
        <section className="py-20 px-6 mt-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {t('Permission Matrix', 'Ma trận phân quyền')}
              </h2>
              <p className={`max-w-xl mx-auto ${darkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                {t(
                  'Detailed comparison of access levels across all system modules',
                  'So sánh chi tiết cấp độ truy cập trên tất cả các modules'
                )}
              </p>
            </div>

            <div className={`backdrop-blur-sm border rounded-2xl overflow-hidden ${
              darkMode
                ? 'bg-neutral-900/50 border-neutral-800'
                : 'bg-white/80 border-slate-200 shadow-lg'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${darkMode ? 'border-neutral-800' : 'border-slate-200'}`}>
                      <th className={`px-6 py-5 text-left text-sm font-semibold ${
                        darkMode ? 'text-neutral-300 bg-neutral-800/50' : 'text-slate-700 bg-slate-50'
                      }`}>
                        Module
                      </th>
                      <th className={`px-6 py-5 text-center text-sm font-semibold ${darkMode ? 'bg-neutral-800/50' : 'bg-slate-50'}`}>
                        <span className={darkMode ? 'text-amber-400' : 'text-amber-600'}>Admin</span>
                      </th>
                      <th className={`px-6 py-5 text-center text-sm font-semibold ${darkMode ? 'bg-neutral-800/50' : 'bg-slate-50'}`}>
                        <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>Manager</span>
                      </th>
                      <th className={`px-6 py-5 text-center text-sm font-semibold ${darkMode ? 'bg-neutral-800/50' : 'bg-slate-50'}`}>
                        <span className={darkMode ? 'text-emerald-400' : 'text-emerald-600'}>Operator</span>
                      </th>
                      <th className={`px-6 py-5 text-center text-sm font-semibold ${darkMode ? 'bg-neutral-800/50' : 'bg-slate-50'}`}>
                        <span className={darkMode ? 'text-neutral-400' : 'text-slate-500'}>Viewer</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissionTable.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`border-b transition-colors ${
                          darkMode
                            ? 'border-neutral-800/50 hover:bg-neutral-800/30'
                            : 'border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {row.module}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`
                            inline-block px-3 py-1.5 text-xs font-medium rounded-md
                            ${row.admin !== '-'
                              ? darkMode
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-amber-50 text-amber-600 border border-amber-200'
                              : darkMode ? 'text-neutral-600' : 'text-slate-400'
                            }
                          `}>
                            {row.admin}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`
                            inline-block px-3 py-1.5 text-xs font-medium rounded-md
                            ${row.manager !== '-'
                              ? darkMode
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-blue-50 text-blue-600 border border-blue-200'
                              : darkMode ? 'text-neutral-600' : 'text-slate-400'
                            }
                          `}>
                            {row.manager}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`
                            inline-block px-3 py-1.5 text-xs font-medium rounded-md
                            ${row.operator !== '-'
                              ? darkMode
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : darkMode ? 'text-neutral-600' : 'text-slate-400'
                            }
                          `}>
                            {row.operator}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`
                            inline-block px-3 py-1.5 text-xs font-medium rounded-md
                            ${row.viewer !== '-'
                              ? darkMode
                                ? 'bg-neutral-700/50 text-neutral-300 border border-neutral-600/30'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                              : darkMode ? 'text-neutral-600' : 'text-slate-400'
                            }
                          `}>
                            {row.viewer}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className={`px-6 py-4 border-t ${
                darkMode
                  ? 'bg-neutral-800/30 border-neutral-800/50'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <p className={`text-xs ${darkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                  <span className={`font-medium ${darkMode ? 'text-neutral-400' : 'text-slate-600'}`}>{t('Legend:', 'Chú thích:')}</span>
                  {' '}C = Create, R = Read, U = Update, D = Delete, A = Approve, Adj = Adjust, Exp = Export
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={`py-8 px-6 border-t ${darkMode ? 'border-neutral-800/50' : 'border-slate-200'}`}>
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded flex items-center justify-center ${
                  darkMode
                    ? 'bg-neutral-800 border border-neutral-700'
                    : 'bg-slate-800 border border-slate-700'
                }`}>
                  <span className="text-white font-bold text-[10px] font-mono">MRP</span>
                </div>
                <span className={`text-sm ${darkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                  {t(
                    'Demo environment • Data resets periodically',
                    'Môi trường demo • Dữ liệu được reset định kỳ'
                  )}
                </span>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <Link
                  href="/"
                  className={`transition-colors ${
                    darkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {t('Home', 'Trang chủ')}
                </Link>
                <Link
                  href="/login"
                  className={`transition-colors ${
                    darkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {t('Sign In', 'Đăng nhập')}
                </Link>
                <span className={darkMode ? 'text-neutral-600' : 'text-slate-400'}>
                  © 2026 RTR-MRP
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
