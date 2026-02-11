'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Users, Phone, Mail, MapPin, Globe,
  CreditCard, ShoppingBag, MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui-v2/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { ConversationPanel } from '@/components/conversations';

interface CustomerDetail {
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
  creditLimit: number | null;
  salesOrders: Array<{
    id: string;
    orderNumber: string;
    orderDate: string;
    status: string;
    totalAmount: number;
  }>;
  _count: {
    salesOrders: number;
  };
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/customers/${params.id}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Không tìm thấy khách hàng.');
          throw new Error('Lỗi tải dữ liệu.');
        }
        const json = await res.json();
        setCustomer(json.data || json);
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold">Không tìm thấy khách hàng</h2>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">Quay lại</Button>
      </div>
    );
  }

  const statusColor = customer.status === 'active'
    ? 'bg-green-100 text-green-800'
    : customer.status === 'pending'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-slate-100 text-slate-800';

  const statusLabel = customer.status === 'active' ? 'Hoạt động'
    : customer.status === 'pending' ? 'Chờ duyệt' : 'Ngưng';

  const totalRevenue = customer.salesOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);

  return (
    <div className="space-y-6 container mx-auto max-w-5xl py-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" className="h-9 w-9 p-0" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {customer.name}
            <Badge variant="outline" className="font-mono text-base">{customer.code}</Badge>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={statusColor}>{statusLabel}</Badge>
            {customer.type && (
              <Badge variant="secondary">{customer.type}</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Contact & Finance */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Thông tin liên hệ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {customer.contactName && (
                <div>
                  <div className="text-muted-foreground text-xs">Người liên hệ</div>
                  <div className="font-medium">{customer.contactName}</div>
                </div>
              )}
              {customer.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${customer.contactEmail}`} className="hover:underline">{customer.contactEmail}</a>
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
              {customer.country && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.country}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                Tài chính
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Hạn mức tín dụng</span>
                <span className="font-mono font-medium">
                  ${(customer.creditLimit || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Điều khoản TT</span>
                <span className="font-medium">{customer.paymentTerms || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tổng đơn hàng</span>
                <span className="font-medium">{customer._count.salesOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tổng doanh thu</span>
                <span className="font-mono font-medium text-green-600">
                  ${totalRevenue.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Tabs */}
        <div className="space-y-6 col-span-2">
          <Tabs defaultValue="orders">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="orders">
                <ShoppingBag className="h-4 w-4 mr-1" />
                Đơn hàng ({customer._count.salesOrders})
              </TabsTrigger>
              <TabsTrigger value="discussions">
                <MessageSquare className="h-4 w-4 mr-1" />
                Thảo luận
              </TabsTrigger>
            </TabsList>

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
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Giá trị</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customer.salesOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Chưa có đơn hàng
                          </TableCell>
                        </TableRow>
                      ) : customer.salesOrders.map((so) => (
                        <TableRow key={so.id}>
                          <TableCell className="font-mono font-medium">{so.orderNumber}</TableCell>
                          <TableCell>{new Date(so.orderDate).toLocaleDateString('vi-VN')}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{so.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${so.totalAmount?.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

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
