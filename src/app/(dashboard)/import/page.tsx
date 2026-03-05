'use client';

// src/app/(dashboard)/import/page.tsx
// Import Hub Page - Central hub for all import operations

import Link from 'next/link';
import {
  Upload,
  History,
  FileSpreadsheet,
  Sparkles,
  ArrowRight,
  Download,
  Columns,
  Package,
  Users,
  Boxes,
  FileStack,
  ShoppingCart,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const IMPORT_TYPES = [
  {
    id: 'parts',
    label: 'Linh kiện / Vật tư',
    description: 'Import danh mục linh kiện, vật tư, nguyên liệu',
    icon: Package,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    id: 'suppliers',
    label: 'Nhà cung cấp',
    description: 'Import thông tin nhà cung cấp, đối tác',
    icon: Users,
    color: 'bg-green-50 text-green-600',
  },
  {
    id: 'bom',
    label: 'BOM (Định mức)',
    description: 'Import định mức vật tư cho sản phẩm',
    icon: FileStack,
    color: 'bg-purple-50 text-purple-600',
  },
  {
    id: 'inventory',
    label: 'Tồn kho',
    description: 'Import số liệu tồn kho, lô hàng',
    icon: Boxes,
    color: 'bg-amber-50 text-amber-600',
  },
  {
    id: 'purchase_orders',
    label: 'Đơn mua hàng',
    description: 'Import đơn đặt hàng từ NCC',
    icon: ShoppingCart,
    color: 'bg-pink-50 text-pink-600',
  },
];

export default function ImportHubPage() {
  return (
    <div className="container py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="w-6 h-6" />
            Import dữ liệu
          </h1>
          <p className="text-muted-foreground mt-1">
            Import dữ liệu từ file Excel với AI tự động nhận diện
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/import/history">
            <Button variant="outline">
              <History className="w-4 h-4 mr-2" />
              Lịch sử import
            </Button>
          </Link>
          <Link href="/excel/templates">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Tải templates
            </Button>
          </Link>
        </div>
      </div>

      {/* AI Feature Banner */}
      <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-purple-900 text-lg">AI Smart Import</h3>
            <p className="text-purple-800 mt-1">
              Tự động nhận diện headers tiếng Việt, đề xuất mapping thông minh, phát hiện trùng lặp và lỗi dữ liệu.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="secondary" className="bg-white/80">
                Hỗ trợ tiếng Việt
              </Badge>
              <Badge variant="secondary" className="bg-white/80">
                Auto-mapping
              </Badge>
              <Badge variant="secondary" className="bg-white/80">
                Phát hiện trùng lặp
              </Badge>
              <Badge variant="secondary" className="bg-white/80">
                Validation thông minh
              </Badge>
            </div>
          </div>
          <Link href="/excel/import" className="w-full sm:w-auto">
            <Button className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto">
              Bắt đầu Import
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Import Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Import theo loại dữ liệu</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {IMPORT_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <Link key={type.id} href={`/excel/import?type=${type.id}`}>
                <Card className="h-full hover:border-primary-300 transition-colors cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${type.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <CardTitle className="text-base">{type.label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{type.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Templates Download */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Templates mẫu
            </CardTitle>
            <CardDescription>
              Tải templates Excel chuẩn để đảm bảo import thành công
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: 'Parts', desc: 'Vật tư, linh kiện', file: 'TEMPLATE_Parts.xlsx', order: 3 },
              { name: 'Suppliers', desc: 'Nhà cung cấp', file: 'TEMPLATE_Suppliers.xlsx', order: 2 },
              { name: 'BOM', desc: 'Định mức sản phẩm', file: 'TEMPLATE_BOM.xlsx', order: 6 },
              { name: 'Inventory', desc: 'Tồn kho hiện tại', file: 'TEMPLATE_Inventory.xlsx', order: 7 },
              { name: 'Warehouses', desc: 'Danh sách kho', file: 'TEMPLATE_Warehouses.xlsx', order: 1 },
              { name: 'PartSupplier', desc: 'Giá mua từ NCC', file: 'TEMPLATE_PartSupplier.xlsx', order: 4 },
              { name: 'PartPlanning', desc: 'MOQ, Lead time, SS', file: 'TEMPLATE_PartPlanning.xlsx', order: 5 },
              { name: 'Customers', desc: 'Khách hàng', file: 'TEMPLATE_Customers.xlsx', order: 8 },
            ]
              .sort((a, b) => a.order - b.order)
              .map((template) => (
              <a
                key={template.file}
                href={`/templates/${template.file}`}
                download
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{template.name}</p>
                  <p className="text-xs text-muted-foreground">{template.order}. {template.desc}</p>
                </div>
                <Download className="w-4 h-4 text-muted-foreground" />
              </a>
            ))}
          </CardContent>
        </Card>

        {/* Saved Mappings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Columns className="w-5 h-5" />
              Mapping đã lưu
            </CardTitle>
            <CardDescription>
              Sử dụng mapping đã lưu để import nhanh hơn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/excel/import?showMappings=true">
              <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg hover:border-primary-300 hover:bg-primary-50/50 transition-colors cursor-pointer">
                <div className="text-center">
                  <Columns className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="font-medium">Quản lý Mappings</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Xem và sử dụng các mapping đã lưu
                  </p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Imports — links to full history */}
      <Link href="/import/history">
        <Card className="hover:border-blue-300 transition-colors cursor-pointer">
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <History className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold">Lịch sử import</p>
                <p className="text-sm text-muted-foreground">Xem chi tiết, hoàn tác hoặc xuất kết quả các phiên import</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      {/* Help Section */}
      <Card className="bg-primary-50 border-primary-200">
        <CardContent className="py-6">
          <h3 className="font-semibold text-primary-900 mb-2">Hướng dẫn Import</h3>
          <ul className="text-sm text-primary-800 space-y-1">
            <li>• Đảm bảo file có headers ở dòng đầu tiên</li>
            <li>• Sử dụng template chuẩn để đạt kết quả tốt nhất</li>
            <li>• AI hỗ trợ headers tiếng Việt: Mã SP, Tên, Đơn giá, Số lượng...</li>
            <li>• Kiểm tra dữ liệu preview trước khi import chính thức</li>
            <li>• Chế độ upsert giúp cập nhật bản ghi đã tồn tại</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
