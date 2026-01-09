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
// ROLE DEFINITIONS - Professional Business Style
// =============================================================================

type Role = 'admin' | 'manager' | 'operator' | 'viewer';

interface RoleInfo {
  key: Role;
  title: string;
  titleVi: string;
  description: string;
  descriptionVi: string;
  icon: React.ElementType;
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

  useEffect(() => {
    const saved = localStorage.getItem('dark-mode');
    if (saved === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

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
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header - Clean Professional */}
      <header className={`sticky top-0 z-50 border-b ${
        darkMode
          ? 'bg-gray-900 border-gray-800'
          : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded flex items-center justify-center ${
              darkMode ? 'bg-gray-800' : 'bg-gray-900'
            }`}>
              <span className="text-white font-bold text-xs">MRP</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                RTR-MRP
              </span>
              <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                darkMode
                  ? 'bg-gray-800 text-gray-400'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                Demo
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
              className={`p-2 rounded transition-colors ${
                darkMode
                  ? 'hover:bg-gray-800 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Globe className="w-4 h-4" />
            </button>
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded transition-colors ${
                darkMode
                  ? 'hover:bg-gray-800 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              href="/login"
              className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium ml-2 transition-colors ${
                darkMode
                  ? 'bg-gray-800 hover:bg-gray-700 text-white'
                  : 'bg-gray-900 hover:bg-gray-800 text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">{t('Sign In', 'Đăng nhập')}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - Professional */}
      <section className="py-12 md:py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm mb-6 ${
            darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-600 border border-gray-200'
          }`}>
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>{t('Demo Environment', 'Môi trường Demo')}</span>
          </div>

          <h1 className={`text-3xl md:text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {t('RTR-MRP Demo', 'Hệ thống RTR-MRP Demo')}
          </h1>

          <p className={`text-base max-w-xl mx-auto ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {t(
              'Select a role to explore the system with different permission levels',
              'Chọn vai trò để khám phá hệ thống với các cấp quyền khác nhau'
            )}
          </p>
        </div>
      </section>

      {/* Error Message */}
      {error && (
        <div className="max-w-3xl mx-auto px-6 mb-6">
          <div className={`rounded p-3 text-center text-sm ${
            darkMode
              ? 'bg-red-900/20 border border-red-800 text-red-400'
              : 'bg-red-50 border border-red-200 text-red-600'
          }`}>
            {error}
          </div>
        </div>
      )}

      {/* Role Cards - Clean Business Grid */}
      <section className="py-4 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => (
            <div
              key={role.key}
              className={`rounded-lg border transition-shadow hover:shadow-md ${
                darkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded flex items-center justify-center ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      <role.icon className={`w-5 h-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {lang === 'en' ? role.title : role.titleVi}
                      </h3>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {lang === 'en' ? role.description : role.descriptionVi}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${
                    darkMode
                      ? 'bg-gray-700 text-gray-400'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {role.badge}
                  </span>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-4">
                  {(lang === 'en' ? role.features : role.featuresVi).map((feature, idx) => (
                    <li
                      key={idx}
                      className={`flex items-center gap-2 text-sm ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      <Check className={`w-4 h-4 flex-shrink-0 ${
                        darkMode ? 'text-gray-500' : 'text-gray-400'
                      }`} />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <button
                  onClick={() => handleQuickLogin(role.key)}
                  disabled={loading !== null}
                  className={`w-full py-2.5 px-4 rounded font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                    loading !== null
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  } ${
                    darkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  {loading === role.key ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {t('Continue as', 'Tiếp tục với')} {lang === 'en' ? role.title : role.titleVi}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Credentials */}
                <div className={`mt-3 pt-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={darkMode ? 'text-gray-600' : 'text-gray-400'}>Demo Account</span>
                    <code className={`font-mono ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      {DEMO_CREDENTIALS[role.key].email.split('@')[0]}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Permission Table - Professional Style */}
      <section className="py-12 px-6 mt-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('Permission Matrix', 'Ma trận phân quyền')}
            </h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {t(
                'Access levels comparison across system modules',
                'So sánh cấp độ truy cập trên các modules'
              )}
            </p>
          </div>

          <div className={`rounded-lg border overflow-hidden ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                    <th className={`px-4 py-3 text-left font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Module
                    </th>
                    <th className={`px-4 py-3 text-center font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Admin
                    </th>
                    <th className={`px-4 py-3 text-center font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Manager
                    </th>
                    <th className={`px-4 py-3 text-center font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Operator
                    </th>
                    <th className={`px-4 py-3 text-center font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Viewer
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {permissionTable.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-b last:border-b-0 ${
                        darkMode ? 'border-gray-700' : 'border-gray-100'
                      }`}
                    >
                      <td className={`px-4 py-3 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {row.module}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={row.admin !== '-' ? (darkMode ? 'text-gray-300' : 'text-gray-700') : (darkMode ? 'text-gray-600' : 'text-gray-400')}>
                          {row.admin}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={row.manager !== '-' ? (darkMode ? 'text-gray-300' : 'text-gray-700') : (darkMode ? 'text-gray-600' : 'text-gray-400')}>
                          {row.manager}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={row.operator !== '-' ? (darkMode ? 'text-gray-300' : 'text-gray-700') : (darkMode ? 'text-gray-600' : 'text-gray-400')}>
                          {row.operator}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={row.viewer !== '-' ? (darkMode ? 'text-gray-300' : 'text-gray-700') : (darkMode ? 'text-gray-600' : 'text-gray-400')}>
                          {row.viewer}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={`px-4 py-3 border-t ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                <span className="font-medium">{t('Legend:', 'Chú thích:')}</span>
                {' '}C = Create, R = Read, U = Update, D = Delete, A = Approve, Adj = Adjust, Exp = Export
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Simple */}
      <footer className={`py-6 px-6 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <span className={darkMode ? 'text-gray-500' : 'text-gray-500'}>
              {t('Demo environment • Data resets periodically', 'Môi trường demo • Dữ liệu reset định kỳ')}
            </span>
            <div className="flex items-center gap-4">
              <Link href="/" className={`transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                {t('Home', 'Trang chủ')}
              </Link>
              <Link href="/login" className={`transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                {t('Sign In', 'Đăng nhập')}
              </Link>
              <span className={darkMode ? 'text-gray-600' : 'text-gray-400'}>© 2026 RTR-MRP</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
