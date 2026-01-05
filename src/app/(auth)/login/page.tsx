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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-white rounded-full translate-x-1/3 translate-y-1/3" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold">MRP</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">RTR MRP</h1>
              <p className="text-blue-200 text-sm">Manufacturing Resource Planning</p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-bold mb-4">
                Quản lý sản xuất<br />thông minh
              </h2>
              <p className="text-blue-100 text-lg max-w-md">
                Hệ thống MRP toàn diện với AI, giúp tối ưu hóa quy trình sản xuất và quản lý tồn kho hiệu quả.
              </p>
            </div>

            <div className="space-y-4">
              {[
                'Hoạch định MRP & Capacity Planning',
                'OEE Dashboard real-time',
                'Quản lý chất lượng SPC',
                'Mobile App cho xưởng sản xuất',
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-300" />
                  <span className="text-blue-50">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-blue-200 text-sm">
            © 2026 RTR Manufacturing. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold text-white">MRP</span>
              </div>
              <div className="text-left">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">RTR MRP</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Manufacturing System</p>
              </div>
            </div>
          </div>

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

          {/* Demo Credentials (Development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/30">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                Demo Credentials (Dev only)
              </p>
              <div className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
                <p><strong>Admin:</strong> admin@rtr.com / admin123456@</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@rtr.com');
                  setPassword('admin123456@');
                }}
                className="mt-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                Fill automatically
              </button>
            </div>
          )}

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
  );
}

// Loading fallback
function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
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
