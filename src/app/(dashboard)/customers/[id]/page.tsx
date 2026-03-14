'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Users, Phone, Mail, MapPin, Globe,
  CreditCard, ShoppingBag, MessageSquare, FileText,
  TrendingUp, Clock, DollarSign, BarChart3,
  User, Star,
} from 'lucide-react';
import { Button } from '@/components/ui-v2/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ConversationPanel } from '@/components/conversations';
import { EntityAuditHistory } from '@/components/audit/entity-audit-history';
import { EntityTooltip } from '@/components/entity-tooltip';

// ===========================================================================
// Types
// ===========================================================================

interface Contact {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  contactType: string;
  isPrimary: boolean;
  notes: string | null;
}

interface TimelineItem {
  type: string;
  date: string;
  title: string;
  description: string;
  status?: string;
}

interface Customer360 {
  customer: {
    id: string;
    code: string;
    name: string;
    type: string | null;
    country: string | null;
    status: string;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    billingAddress: string | null;
    paymentTerms: string | null;
    tier: string;
    createdAt: string;
  };
  credit: {
    creditLimit: number;
    creditUsed: number;
    creditRemaining: number | null;
    utilizationPercent: number;
    isUnlimited: boolean;
  };
  contacts: Contact[];
  stats: {
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    totalQuotations: number;
    convertedQuotations: number;
    conversionRate: number;
    totalInvoices: number;
    totalInvoiced: number;
    totalReceived: number;
    totalOutstanding: number;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    orderDate: string;
    status: string;
    totalAmount: number;
    sourceType: string;
  }>;
  recentQuotations: Array<{
    id: string;
    quoteNumber: string;
    status: string;
    totalAmount: number;
    validUntil: string;
    createdAt: string;
  }>;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    status: string;
    totalAmount: number;
    receivedAmount: number;
    balanceDue: number;
  }>;
  timeline: TimelineItem[];
}

// ===========================================================================
// Helpers
// ===========================================================================

function formatCurrency(val: number) {
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('vi-VN');
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  inactive: 'bg-slate-100 text-slate-800',
  draft: 'bg-slate-100 text-slate-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  converted: 'bg-purple-100 text-purple-800',
  expired: 'bg-orange-100 text-orange-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_production: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-teal-100 text-teal-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  DRAFT: 'bg-slate-100 text-slate-800',
  SENT: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
  OVERDUE: 'bg-red-100 text-red-800',
  VOID: 'bg-slate-100 text-slate-800',
};

const tierColors: Record<string, string> = {
  A: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  B: 'bg-blue-100 text-blue-800 border-blue-300',
  C: 'bg-slate-100 text-slate-800 border-slate-300',
};

const contactTypeLabels: Record<string, string> = {
  general: 'Chung',
  billing: 'Thanh toán',
  shipping: 'Giao hàng',
  technical: 'Kỹ thuật',
  decision_maker: 'Quyết định',
};

const timelineIcons: Record<string, typeof ShoppingBag> = {
  order: ShoppingBag,
  quotation: FileText,
  invoice: DollarSign,
};

// ===========================================================================
// Component
// ===========================================================================

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Customer360 | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/customers/${params.id}/360`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Không tìm thấy khách hàng.');
        throw new Error('Lỗi tải dữ liệu.');
      }
      const json = await res.json();
      setData(json.data);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold">Không tìm thấy khách hàng</h2>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">Quay lại</Button>
      </div>
    );
  }

  const { customer, credit, contacts, stats, recentOrders, recentQuotations, recentInvoices, timeline } = data;

  const customerStatusColor = statusColors[customer.status] || 'bg-slate-100 text-slate-800';
  const customerStatusLabel = customer.status === 'active' ? 'Hoạt động'
    : customer.status === 'pending' ? 'Chờ duyệt' : 'Ngưng';

  return (
    <div className="space-y-6 container mx-auto max-w-6xl py-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" iconOnly onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {customer.name}
            <Badge variant="outline" className="font-mono text-base">{customer.code}</Badge>
            <Badge className={`${tierColors[customer.tier] || tierColors.C} border`}>
              Tier {customer.tier}
            </Badge>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={customerStatusColor}>{customerStatusLabel}</Badge>
            {customer.type && <Badge variant="secondary">{customer.type}</Badge>}
            {customer.country && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" /> {customer.country}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <ShoppingBag className="h-3.5 w-3.5" /> Tổng đơn hàng
            </div>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              TB: {formatCurrency(stats.avgOrderValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3.5 w-3.5" /> Tổng doanh thu
            </div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <BarChart3 className="h-3.5 w-3.5" /> Tỷ lệ chuyển đổi
            </div>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {stats.convertedQuotations}/{stats.totalQuotations} báo giá
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="h-3.5 w-3.5" /> Công nợ
            </div>
            <div className={`text-2xl font-bold ${stats.totalOutstanding > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {formatCurrency(stats.totalOutstanding)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Utilization Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CreditCard className="h-4 w-4" />
              Sử dụng tín dụng
            </div>
            <div className="text-sm text-muted-foreground">
              {credit.isUnlimited ? (
                <span className="text-green-600 font-medium">Không giới hạn</span>
              ) : (
                <>
                  {formatCurrency(credit.creditUsed)} / {formatCurrency(credit.creditLimit)}
                  <span className="ml-2">
                    (Còn: {credit.creditRemaining !== null ? formatCurrency(credit.creditRemaining) : '∞'})
                  </span>
                </>
              )}
            </div>
          </div>
          {!credit.isUnlimited && (
            <div className="space-y-1">
              <Progress
                value={Math.min(credit.utilizationPercent, 100)}
                className="h-2.5"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{credit.utilizationPercent}% sử dụng</span>
                <span>Điều khoản: {customer.paymentTerms || 'N/A'}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content: Info + Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Contact Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Thông tin liên hệ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {customer.contactName && (
                <div>
                  <div className="text-muted-foreground text-xs">Người liên hệ</div>
                  <div className="font-medium">{customer.contactName}</div>
                </div>
              )}
              {customer.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${customer.contactEmail}`} className="hover:underline text-blue-600">{customer.contactEmail}</a>
                </div>
              )}
              {customer.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.contactPhone}</span>
                </div>
              )}
              {customer.billingAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{customer.billingAddress}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Tóm tắt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hóa đơn</span>
                <span className="font-medium">{stats.totalInvoices}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Đã thu</span>
                <span className="font-mono text-green-600">{formatCurrency(stats.totalReceived)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Còn nợ</span>
                <span className={`font-mono ${stats.totalOutstanding > 0 ? 'text-orange-600' : ''}`}>
                  {formatCurrency(stats.totalOutstanding)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground">Từ</span>
                <span className="text-xs">{formatDate(customer.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Tabs */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
              <TabsTrigger value="orders">
                Đơn hàng ({stats.totalOrders})
              </TabsTrigger>
              <TabsTrigger value="quotations">
                Báo giá ({stats.totalQuotations})
              </TabsTrigger>
              <TabsTrigger value="contacts">
                Liên hệ ({contacts.length})
              </TabsTrigger>
              <TabsTrigger value="history">Lịch sử</TabsTrigger>
              <TabsTrigger value="discussions">
                Thảo luận
              </TabsTrigger>
            </TabsList>

            {/* Overview / Timeline */}
            <TabsContent value="overview" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Dòng thời gian hoạt động
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {timeline.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Chưa có hoạt động</p>
                  ) : (
                    <div className="space-y-4">
                      {timeline.map((item, i) => {
                        const Icon = timelineIcons[item.type] || Clock;
                        return (
                          <div key={i} className="flex gap-3 items-start">
                            <div className="mt-0.5 p-1.5 rounded-full bg-muted">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{item.title}</span>
                                {item.status && (
                                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${statusColors[item.status] || ''}`}>
                                    {item.status}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{item.description}</div>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(item.date)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Đơn hàng gần đây</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Số ĐH</TableHead>
                        <TableHead>Ngày đặt</TableHead>
                        <TableHead>Nguồn</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Giá trị</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Chưa có đơn hàng
                          </TableCell>
                        </TableRow>
                      ) : recentOrders.map((so) => (
                        <TableRow
                          key={so.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/sales/orders/${so.id}`)}
                        >
                          <TableCell>
                            <EntityTooltip type="so" id={so.id}>
                              <span className="font-mono font-medium cursor-help">{so.orderNumber}</span>
                            </EntityTooltip>
                          </TableCell>
                          <TableCell>{formatDate(so.orderDate)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {so.sourceType === 'quote_auto' ? 'Tự động' : so.sourceType === 'quote_manual' ? 'Từ BG' : 'Trực tiếp'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[so.status] || 'bg-slate-100'}>{so.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(so.totalAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Quotations Tab */}
            <TabsContent value="quotations" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Báo giá gần đây</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Số BG</TableHead>
                        <TableHead>Ngày tạo</TableHead>
                        <TableHead>Hạn hiệu lực</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Giá trị</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentQuotations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Chưa có báo giá
                          </TableCell>
                        </TableRow>
                      ) : recentQuotations.map((q) => (
                        <TableRow
                          key={q.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/sales/quotations/${q.id}`)}
                        >
                          <TableCell className="font-mono font-medium">{q.quoteNumber}</TableCell>
                          <TableCell>{formatDate(q.createdAt)}</TableCell>
                          <TableCell>{formatDate(q.validUntil)}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[q.status] || 'bg-slate-100'}>{q.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(q.totalAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contacts Tab */}
            <TabsContent value="contacts" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Danh sách liên hệ</CardTitle>
                </CardHeader>
                <CardContent>
                  {contacts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Chưa có liên hệ</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {contacts.map((c) => (
                        <div key={c.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{c.name}</span>
                            {c.isPrimary && (
                              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                            )}
                            <Badge variant="outline" className="text-[10px] ml-auto">
                              {contactTypeLabels[c.contactType] || c.contactType}
                            </Badge>
                          </div>
                          {c.title && (
                            <div className="text-xs text-muted-foreground">{c.title}</div>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                            {c.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <a href={`mailto:${c.email}`} className="hover:underline text-blue-600">{c.email}</a>
                              </span>
                            )}
                            {c.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {c.phone}
                              </span>
                            )}
                            {c.mobile && (
                              <span className="text-muted-foreground">Mobile: {c.mobile}</span>
                            )}
                          </div>
                          {c.notes && (
                            <div className="text-xs text-muted-foreground italic">{c.notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-4">
              <EntityAuditHistory entityType="Customer" entityId={customer.id} title="Lịch sử thay đổi" />
            </TabsContent>

            {/* Discussions Tab */}
            <TabsContent value="discussions" className="mt-4">
              <ConversationPanel
                contextType="CUSTOMER"
                contextId={customer.id}
                contextTitle={`${customer.code} - ${customer.name}`}
                className="h-[500px]"
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
