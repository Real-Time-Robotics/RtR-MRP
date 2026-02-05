// =============================================================================
// RTR MRP - LOGIN PAGE
// Professional authentication interface
// =============================================================================

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  Shield,
  ArrowRight,
  CheckCircle,
  KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// LOGIN CONTENT COMPONENT
// =============================================================================

function LoginContent() {
  const router = useRouter();
  const { status } = useSession();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/home';
  const error = searchParams?.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showMFA, setShowMFA] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      router.push(callbackUrl);
    }
  }, [status, callbackUrl, router]);

  // Handle error from URL
  useEffect(() => {
    if (error) {
      switch (error) {
        case 'CredentialsSignin':
          setLoginError('Email hoặc mật khẩu không đúng');
          break;
        case 'SessionRequired':
          setLoginError('Vui lòng đăng nhập để tiếp tục');
          break;
        default:
          setLoginError('Đã có lỗi xảy ra. Vui lòng thử lại');
      }
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: email.toLowerCase().trim(),
        password,
        totp: totpCode || undefined,
      });

      if (result?.error) {
        if (result.error === 'MFA_REQUIRED') {
          setShowMFA(true);
          setLoginError(null);
        } else {
          setLoginError('Email hoặc mật khẩu không đúng');
        }
      } else if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setLoginError('Đã có lỗi xảy ra. Vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-gray-900">
      {/* Full Width Layout */}
      <div className="w-full flex flex-col lg:flex-row">
        {/* Left Panel - Branding (Full width on mobile, 55% on desktop) */}
        <div className="w-full lg:w-[55%] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden flex flex-col justify-between p-8 lg:p-12 min-h-[40vh] lg:min-h-screen">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
          </div>

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />

          {/* Content */}
          <div className="relative z-10 flex flex-col h-full justify-between text-white">
            {/* Bloomberg-style Logo */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 lg:h-12 lg:w-12 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                <span className="text-white font-bold text-sm lg:text-base font-mono">MRP</span>
              </div>
              <span className="font-bold text-xl lg:text-2xl font-mono text-white tracking-tight flex items-end">
                MRP<span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-orange-500 ml-0.5 mb-1" />
              </span>
            </div>

            {/* Features */}
            <div className="space-y-6 lg:space-y-8 my-8 lg:my-0">
              <div>
                <h2 className="text-3xl lg:text-5xl font-bold mb-4 leading-tight text-white">
                  Manufacturing<br />Intelligence
                </h2>
                <p className="text-gray-400 text-base lg:text-lg max-w-md">
                  Enterprise MRP with AI-powered analytics. Optimize production, manage inventory, and drive efficiency.
                </p>
              </div>

              <div className="space-y-3 lg:space-y-4">
                {[
                  'MRP & Capacity Planning',
                  'Real-time OEE Dashboard',
                  'SPC Quality Management',
                  'Shop Floor Mobile App',
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="text-gray-500 text-sm font-mono">
              © 2026 RTR Manufacturing
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form (Full width on mobile, 45% on desktop) */}
        <div className="w-full lg:w-[45%] flex items-center justify-center p-6 lg:p-12 bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-md">
          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {showMFA ? 'Xác thực 2 bước' : 'Đăng nhập'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {showMFA
                ? 'Nhập mã OTP từ ứng dụng authenticator'
                : 'Đăng nhập để truy cập hệ thống quản lý sản xuất'
              }
            </p>
          </div>

          {/* Error Alert */}
          {loginError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Đăng nhập thất bại
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                  {loginError}
                </p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!showMFA ? (
              <>
                {/* Email Input */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={cn(
                        'block w-full pl-12 pr-4 py-3 rounded-xl border transition-all',
                        'bg-white dark:bg-gray-800',
                        'border-gray-300 dark:border-gray-700',
                        'text-gray-900 dark:text-white',
                        'placeholder-gray-400 dark:placeholder-gray-500',
                        'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                      placeholder="your@email.com"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn(
                        'block w-full pl-12 pr-12 py-3 rounded-xl border transition-all',
                        'bg-white dark:bg-gray-800',
                        'border-gray-300 dark:border-gray-700',
                        'text-gray-900 dark:text-white',
                        'placeholder-gray-400 dark:placeholder-gray-500',
                        'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                      placeholder="••••••••••••"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Ghi nhớ đăng nhập
                    </span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
              </>
            ) : (
              /* MFA Input */
              <div>
                <label
                  htmlFor="totp"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Mã xác thực (OTP)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="totp"
                    name="totp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    className={cn(
                      'block w-full pl-12 pr-4 py-3 rounded-xl border transition-all text-center text-2xl tracking-[0.5em]',
                      'bg-white dark:bg-gray-800',
                      'border-gray-300 dark:border-gray-700',
                      'text-gray-900 dark:text-white',
                      'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
                    )}
                    placeholder="000000"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Nhập mã 6 số từ ứng dụng Google Authenticator
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowMFA(false);
                    setTotpCode('');
                  }}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700"
                >
                  ← Quay lại đăng nhập
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full py-3 px-4 rounded-xl font-semibold text-white transition-all',
                'bg-gradient-to-r from-blue-600 to-indigo-600',
                'hover:from-blue-700 hover:to-indigo-700',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <span>{showMFA ? 'Xác thực' : 'Đăng nhập'}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Bảo mật dữ liệu
                </p>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  Kết nối được mã hóa SSL. Không chia sẻ mật khẩu với bất kỳ ai.
                </p>
              </div>
            </div>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Demo Account Available
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Email</p>
                  <p className="font-mono text-gray-900 dark:text-gray-100">admin@demo.rtr-mrp.com</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Password</p>
                  <p className="font-mono text-gray-900 dark:text-gray-100">Admin@Demo2026!</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@demo.rtr-mrp.com');
                setPassword('Admin@Demo2026!');
              }}
              className="mt-3 w-full py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-blue-200 dark:border-blue-700 transition-colors"
            >
              Use Demo Account
            </button>
          </div>

          {/* Demo Page Link */}
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800/30">
            <div className="text-center">
              <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                Want to try different roles?
              </p>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Try Demo with Role Selector
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              Having issues?{' '}
              <Link href="/help" className="text-blue-600 hover:text-blue-700 font-medium">
                Contact support
              </Link>
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback
function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

// Default export with Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}
