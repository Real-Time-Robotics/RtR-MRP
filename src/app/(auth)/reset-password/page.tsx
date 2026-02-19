'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setValidationError('Token không hợp lệ');
      setIsValidating(false);
      return;
    }

    fetch(`/api/auth/reset-password?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setIsValid(true);
        } else {
          setValidationError(data.error || 'Token không hợp lệ');
        }
      })
      .catch(() => {
        setValidationError('Không thể xác thực token');
      })
      .finally(() => {
        setIsValidating(false);
      });
  }, [token]);

  const passwordChecks = [
    { label: 'Ít nhất 12 ký tự', valid: newPassword.length >= 12 },
    { label: 'Có chữ in hoa', valid: /[A-Z]/.test(newPassword) },
    { label: 'Có chữ thường', valid: /[a-z]/.test(newPassword) },
    { label: 'Có chữ số', valid: /[0-9]/.test(newPassword) },
    { label: 'Có ký tự đặc biệt', valid: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
  ];

  const allChecksPass = passwordChecks.every((c) => c.valid);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allChecksPass || !passwordsMatch) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Đã xảy ra lỗi');
      } else {
        setIsSubmitted(true);
      }
    } catch {
      setError('Không thể kết nối đến server');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Invalid token
  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Link không hợp lệ
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {validationError || 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'}
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Yêu cầu link mới
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Đặt lại mật khẩu thành công
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Mật khẩu của bạn đã được cập nhật. Vui lòng đăng nhập với mật khẩu mới.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại đăng nhập
        </Link>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Đặt lại mật khẩu
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Nhập mật khẩu mới cho tài khoản của bạn.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mật khẩu mới
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                aria-label="Mật khẩu mới"
                className={cn(
                  'block w-full pl-12 pr-12 py-3 rounded-xl border transition-all',
                  'bg-white dark:bg-gray-800',
                  'border-gray-300 dark:border-gray-700',
                  'text-gray-900 dark:text-white',
                  'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                )}
                placeholder="Mật khẩu mới"
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

          {/* Password Requirements */}
          {newPassword.length > 0 && (
            <div className="space-y-1.5">
              {passwordChecks.map((check, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {check.valid ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  )}
                  <span className={check.valid ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                    {check.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-label="Xác nhận mật khẩu"
                className={cn(
                  'block w-full pl-12 pr-4 py-3 rounded-xl border transition-all',
                  'bg-white dark:bg-gray-800',
                  confirmPassword.length > 0 && !passwordsMatch
                    ? 'border-red-300 dark:border-red-700'
                    : 'border-gray-300 dark:border-gray-700',
                  'text-gray-900 dark:text-white',
                  'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                )}
                placeholder="Nhập lại mật khẩu"
                disabled={isLoading}
              />
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="mt-1.5 text-sm text-red-500">Mật khẩu không khớp</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !allChecksPass || !passwordsMatch}
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
                Đang xử lý...
              </>
            ) : (
              'Đặt lại mật khẩu'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
