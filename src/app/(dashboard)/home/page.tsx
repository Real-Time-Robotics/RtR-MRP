'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package,
  ShoppingCart,
  Factory,
  AlertTriangle,
  TrendingUp,
  Calendar,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';

interface DashboardData {
  pendingOrders: number;
  pendingOrdersValue: number;
  criticalStock: number;
  activePOs: number;
  activePOsValue: number;
  reorderAlerts: number;
}

export default function HomePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else {
          setError('Failed to load dashboard');
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const quickLinks = [
    { label: 'Sales Orders', href: '/orders', icon: ShoppingCart, color: 'bg-blue-500' },
    { label: 'Inventory', href: '/inventory', icon: Package, color: 'bg-green-500' },
    { label: 'Production', href: '/production', icon: Factory, color: 'bg-purple-500' },
    { label: 'MRP Planning', href: '/mrp', icon: TrendingUp, color: 'bg-orange-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('dashboard.description')}</p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
          {error} - Showing default values
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold">{stats?.pendingOrders ?? 0}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats?.pendingOrdersValue ?? 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={(stats?.criticalStock ?? 0) > 0 ? 'border-red-200 dark:border-red-800' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Stock</p>
                <p className={`text-2xl font-bold ${(stats?.criticalStock ?? 0) > 0 ? 'text-red-600' : ''}`}>
                  {stats?.criticalStock ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  Items below minimum
                </p>
              </div>
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                (stats?.criticalStock ?? 0) > 0
                  ? 'bg-red-100 dark:bg-red-900/50'
                  : 'bg-green-100 dark:bg-green-900/50'
              }`}>
                <AlertTriangle className={`h-6 w-6 ${
                  (stats?.criticalStock ?? 0) > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active POs</p>
                <p className="text-2xl font-bold">{stats?.activePOs ?? 0}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats?.activePOsValue ?? 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={(stats?.reorderAlerts ?? 0) > 0 ? 'border-amber-200 dark:border-amber-800' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reorder Alerts</p>
                <p className={`text-2xl font-bold ${(stats?.reorderAlerts ?? 0) > 0 ? 'text-amber-600' : ''}`}>
                  {stats?.reorderAlerts ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  Items to reorder
                </p>
              </div>
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                (stats?.reorderAlerts ?? 0) > 0
                  ? 'bg-amber-100 dark:bg-amber-900/50'
                  : 'bg-green-100 dark:bg-green-900/50'
              }`}>
                <Factory className={`h-6 w-6 ${
                  (stats?.reorderAlerts ?? 0) > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-green-600 dark:text-green-400'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickLinks.map((link) => (
              <Button
                key={link.href}
                variant="outline"
                className="h-auto py-6 flex flex-col items-center gap-2"
                onClick={() => router.push(link.href)}
              >
                <div className={`p-2 rounded-lg ${link.color}`}>
                  <link.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium">{link.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
