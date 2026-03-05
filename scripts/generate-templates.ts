#!/usr/bin/env ts-node
// scripts/generate-templates.ts
// Generate Master Data Excel Templates for RTR-MRP
// Usage: npx ts-node scripts/generate-templates.ts

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'templates');

// ============================================================================
// TYPES
// ============================================================================

interface ColumnDef {
  field: string;
  header: string;      // Vietnamese header for production team
  dbField: string;     // Actual DB field name
  type: 'text' | 'number' | 'date' | 'boolean';
  required: boolean;
  description: string; // Vietnamese description
  example: string;
  allowedValues?: string[];
  defaultValue?: string;
  width?: number;
}

interface TemplateConfig {
  fileName: string;
  sheetName: string;
  title: string;
  description: string;
  columns: ColumnDef[];
  exampleData: Record<string, unknown>[];
  importOrder: number;
  notes: string[];
}

// ============================================================================
// TEMPLATE DEFINITIONS — MAPPED TO PRISMA SCHEMA
// ============================================================================

const TEMPLATES: TemplateConfig[] = [
  // -----------------------------------------------------------------------
  // 1. WAREHOUSES (Import first — referenced by Inventory)
  // -----------------------------------------------------------------------
  {
    fileName: 'TEMPLATE_Warehouses.xlsx',
    sheetName: 'Warehouses',
    title: 'DANH SACH KHO (WAREHOUSES)',
    description: 'Nhap danh sach cac kho hang trong he thong',
    importOrder: 1,
    columns: [
      { field: 'code', header: 'Ma kho', dbField: 'code', type: 'text', required: true, description: 'Ma kho duy nhat (unique)', example: 'WH-MAIN', width: 15 },
      { field: 'name', header: 'Ten kho', dbField: 'name', type: 'text', required: true, description: 'Ten day du cua kho', example: 'Kho chinh', width: 25 },
      { field: 'type', header: 'Loai kho', dbField: 'type', type: 'text', required: false, description: 'Loai kho', example: 'MAIN', allowedValues: ['RECEIVING', 'QUARANTINE', 'MAIN', 'WIP', 'FINISHED_GOODS', 'SHIPPING', 'HOLD', 'SCRAP'], width: 18 },
      { field: 'location', header: 'Dia chi', dbField: 'location', type: 'text', required: false, description: 'Dia chi hoac vi tri kho', example: 'Tang 1, Nha xuong A', width: 30 },
      { field: 'isDefault', header: 'Kho mac dinh', dbField: 'isDefault', type: 'boolean', required: false, description: 'TRUE neu la kho mac dinh', example: 'TRUE', allowedValues: ['TRUE', 'FALSE'], defaultValue: 'FALSE', width: 15 },
    ],
    exampleData: [
      { code: 'WH-MAIN', name: 'Kho chinh', type: 'MAIN', location: 'Tang 1, Nha xuong A', isDefault: 'TRUE' },
      { code: 'WH-RECEIVING', name: 'Kho nhan hang', type: 'RECEIVING', location: 'Cong nhan hang', isDefault: 'FALSE' },
      { code: 'WH-WIP', name: 'Kho san xuat do dang', type: 'WIP', location: 'Tang 2, Xuong SX', isDefault: 'FALSE' },
      { code: 'WH-FG', name: 'Kho thanh pham', type: 'FINISHED_GOODS', location: 'Tang 1, Khu B', isDefault: 'FALSE' },
      { code: 'WH-QUARANTINE', name: 'Kho cach ly QC', type: 'QUARANTINE', location: 'Phong QC', isDefault: 'FALSE' },
    ],
    notes: [
      'Import Warehouses TRUOC KHI import Inventory',
      'Moi kho can co ma (code) duy nhat',
      'Chi 1 kho duoc dat lam mac dinh (isDefault = TRUE)',
    ],
  },

  // -----------------------------------------------------------------------
  // 2. SUPPLIERS
  // -----------------------------------------------------------------------
  {
    fileName: 'TEMPLATE_Suppliers.xlsx',
    sheetName: 'Suppliers',
    title: 'NHA CUNG CAP (SUPPLIERS)',
    description: 'Nhap danh sach nha cung cap',
    importOrder: 2,
    columns: [
      { field: 'code', header: 'Ma NCC', dbField: 'code', type: 'text', required: true, description: 'Ma NCC duy nhat (unique)', example: 'SUP-001', width: 12 },
      { field: 'name', header: 'Ten NCC', dbField: 'name', type: 'text', required: true, description: 'Ten cong ty NCC', example: 'Cong ty TNHH ABC', width: 30 },
      { field: 'country', header: 'Quoc gia', dbField: 'country', type: 'text', required: true, description: 'Quoc gia', example: 'VN', width: 12 },
      { field: 'contactName', header: 'Nguoi lien he', dbField: 'contactName', type: 'text', required: false, description: 'Ten nguoi lien he', example: 'Nguyen Van A', width: 20 },
      { field: 'contactEmail', header: 'Email', dbField: 'contactEmail', type: 'text', required: false, description: 'Dia chi email', example: 'contact@abc.com', width: 25 },
      { field: 'contactPhone', header: 'Dien thoai', dbField: 'contactPhone', type: 'text', required: false, description: 'So dien thoai', example: '0901234567', width: 15 },
      { field: 'address', header: 'Dia chi', dbField: 'address', type: 'text', required: false, description: 'Dia chi cong ty', example: '123 Nguyen Hue, Q1, HCM', width: 35 },
      { field: 'taxId', header: 'Ma so thue', dbField: 'taxId', type: 'text', required: false, description: 'Ma so thue doanh nghiep', example: '0123456789', width: 15 },
      { field: 'paymentTerms', header: 'Dieu khoan TT', dbField: 'paymentTerms', type: 'text', required: false, description: 'Dieu khoan thanh toan', example: 'NET30', allowedValues: ['COD', 'NET15', 'NET30', 'NET45', 'NET60'], width: 15 },
      { field: 'leadTimeDays', header: 'Lead time (ngay)', dbField: 'leadTimeDays', type: 'number', required: true, description: 'Thoi gian giao hang mac dinh (ngay)', example: '14', width: 18 },
      { field: 'rating', header: 'Danh gia (1-100)', dbField: 'rating', type: 'number', required: false, description: 'Diem danh gia NCC (1-100)', example: '85', width: 18 },
      { field: 'ndaaCompliant', header: 'NDAA', dbField: 'ndaaCompliant', type: 'boolean', required: false, description: 'Tuan thu NDAA', example: 'TRUE', allowedValues: ['TRUE', 'FALSE'], defaultValue: 'TRUE', width: 10 },
      { field: 'category', header: 'Phan loai', dbField: 'category', type: 'text', required: false, description: 'Phan loai NCC', example: 'ELECTRONIC', width: 15 },
    ],
    exampleData: [
      { code: 'SUP-001', name: 'Cong ty TNHH Dien tu ABC', country: 'VN', contactName: 'Nguyen Van A', contactEmail: 'a@abc.com', contactPhone: '0901234567', address: '123 Nguyen Hue, Q1, HCM', taxId: '0123456789', paymentTerms: 'NET30', leadTimeDays: 14, rating: 85, ndaaCompliant: 'TRUE', category: 'ELECTRONIC' },
      { code: 'SUP-002', name: 'Cong ty Co khi XYZ', country: 'VN', contactName: 'Tran Van B', contactEmail: 'b@xyz.com', contactPhone: '0912345678', address: '456 Le Lai, Q3, HCM', taxId: '9876543210', paymentTerms: 'NET45', leadTimeDays: 21, rating: 75, ndaaCompliant: 'TRUE', category: 'MECHANICAL' },
      { code: 'SUP-003', name: 'Digikey Electronics', country: 'US', contactName: '', contactEmail: 'support@digikey.com', contactPhone: '', address: 'Thief River Falls, MN, USA', taxId: '', paymentTerms: 'NET30', leadTimeDays: 30, rating: 95, ndaaCompliant: 'TRUE', category: 'ELECTRONIC' },
    ],
    notes: [
      'Import Suppliers TRUOC KHI import PartSupplier',
      'Ma NCC (code) phai duy nhat',
      'leadTimeDays la so ngay giao hang mac dinh',
      'rating tu 1-100 (100 = tot nhat)',
    ],
  },

  // -----------------------------------------------------------------------
  // 3. PARTS (Vat tu / Linh kien)
  // -----------------------------------------------------------------------
  {
    fileName: 'TEMPLATE_Parts.xlsx',
    sheetName: 'Parts',
    title: 'VAT TU / LINH KIEN (PARTS)',
    description: 'Nhap danh sach vat tu, linh kien, nguyen vat lieu',
    importOrder: 3,
    columns: [
      { field: 'partNumber', header: 'Ma vat tu', dbField: 'partNumber', type: 'text', required: true, description: 'Ma vat tu duy nhat (unique)', example: 'PRT-MT-001', width: 16 },
      { field: 'name', header: 'Ten vat tu', dbField: 'name', type: 'text', required: true, description: 'Ten day du cua vat tu', example: 'Motor 12V DC 3000RPM', width: 30 },
      { field: 'description', header: 'Mo ta', dbField: 'description', type: 'text', required: false, description: 'Mo ta chi tiet', example: 'Motor DC 12V, 3000 vong/phut, truc 5mm', width: 40 },
      { field: 'category', header: 'Phan loai', dbField: 'category', type: 'text', required: true, description: 'Nhom vat tu', example: 'MOTOR', allowedValues: ['MOTOR', 'SENSOR', 'PCB', 'MECHANICAL', 'ELECTRICAL', 'RAW_MATERIAL', 'PACKAGING', 'FASTENER', 'CABLE', 'CONNECTOR', 'OTHER'], width: 15 },
      { field: 'unit', header: 'Don vi tinh', dbField: 'unit', type: 'text', required: true, description: 'Don vi tinh', example: 'PCS', allowedValues: ['PCS', 'KG', 'M', 'SET', 'L', 'BOX', 'ROLL', 'SHEET', 'PAIR'], defaultValue: 'PCS', width: 12 },
      { field: 'makeOrBuy', header: 'Tu SX/Mua', dbField: 'makeOrBuy', type: 'text', required: true, description: 'MAKE = Tu san xuat, BUY = Mua ngoai', example: 'BUY', allowedValues: ['MAKE', 'BUY'], width: 12 },
      { field: 'unitCost', header: 'Gia don vi', dbField: 'unitCost', type: 'number', required: false, description: 'Gia (VND). Khong dung dau phay', example: '50000', defaultValue: '0', width: 14 },
      { field: 'moq', header: 'MOQ', dbField: 'moq', type: 'number', required: false, description: 'So luong dat hang toi thieu', example: '100', defaultValue: '1', width: 10 },
      { field: 'orderMultiple', header: 'Boi so DH', dbField: 'orderMultiple', type: 'number', required: false, description: 'Boi so dat hang (VD: chi dat theo boi 10)', example: '10', defaultValue: '1', width: 12 },
      { field: 'leadTimeDays', header: 'Lead time (ngay)', dbField: 'leadTimeDays', type: 'number', required: false, description: 'Thoi gian cho (ngay)', example: '14', defaultValue: '14', width: 18 },
      { field: 'safetyStock', header: 'Ton kho an toan', dbField: 'safetyStock', type: 'number', required: false, description: 'So luong ton kho an toan', example: '50', defaultValue: '0', width: 16 },
      { field: 'reorderPoint', header: 'Diem dat hang', dbField: 'reorderPoint', type: 'number', required: false, description: 'Khi ton kho <= so nay, can dat hang', example: '100', defaultValue: '0', width: 14 },
      { field: 'minStockLevel', header: 'Ton kho toi thieu', dbField: 'minStockLevel', type: 'number', required: false, description: 'Muc ton kho toi thieu', example: '20', defaultValue: '0', width: 16 },
      { field: 'lifecycleStatus', header: 'Trang thai', dbField: 'lifecycleStatus', type: 'text', required: false, description: 'Trang thai vat tu', example: 'ACTIVE', allowedValues: ['ACTIVE', 'PROTOTYPE', 'OBSOLETE', 'END_OF_LIFE'], defaultValue: 'ACTIVE', width: 14 },
      { field: 'isCritical', header: 'Quan trong', dbField: 'isCritical', type: 'boolean', required: false, description: 'TRUE neu la vat tu quan trong', example: 'FALSE', allowedValues: ['TRUE', 'FALSE'], defaultValue: 'FALSE', width: 12 },
      { field: 'ndaaCompliant', header: 'NDAA', dbField: 'ndaaCompliant', type: 'boolean', required: false, description: 'Tuan thu NDAA', example: 'TRUE', allowedValues: ['TRUE', 'FALSE'], defaultValue: 'TRUE', width: 10 },
      { field: 'countryOfOrigin', header: 'Nuoc san xuat', dbField: 'countryOfOrigin', type: 'text', required: false, description: 'Nuoc san xuat', example: 'JP', width: 14 },
    ],
    exampleData: [
      { partNumber: 'PRT-MT-001', name: 'Motor 12V DC 3000RPM', description: 'Motor DC 12V, 3000 vong/phut, truc 5mm', category: 'MOTOR', unit: 'PCS', makeOrBuy: 'BUY', unitCost: 50000, moq: 100, orderMultiple: 10, leadTimeDays: 14, safetyStock: 50, reorderPoint: 100, minStockLevel: 20, lifecycleStatus: 'ACTIVE', isCritical: 'FALSE', ndaaCompliant: 'TRUE', countryOfOrigin: 'JP' },
      { partNumber: 'PRT-SEN-001', name: 'Cam bien tiem can 5V', description: 'Proximity sensor NPN, 5V, 10mm range', category: 'SENSOR', unit: 'PCS', makeOrBuy: 'BUY', unitCost: 25000, moq: 50, orderMultiple: 1, leadTimeDays: 7, safetyStock: 20, reorderPoint: 40, minStockLevel: 10, lifecycleStatus: 'ACTIVE', isCritical: 'FALSE', ndaaCompliant: 'TRUE', countryOfOrigin: 'CN' },
      { partNumber: 'SA-FRAME-01', name: 'Khung Drone Assembly', description: 'Khung composite cho drone, kich thuoc 450mm', category: 'MECHANICAL', unit: 'SET', makeOrBuy: 'MAKE', unitCost: 150000, moq: 10, orderMultiple: 1, leadTimeDays: 3, safetyStock: 5, reorderPoint: 10, minStockLevel: 5, lifecycleStatus: 'ACTIVE', isCritical: 'TRUE', ndaaCompliant: 'TRUE', countryOfOrigin: 'VN' },
      { partNumber: 'PRT-PCB-001', name: 'Main Control Board v2', description: 'PCB dieu khien chinh, STM32, 4 layer', category: 'PCB', unit: 'PCS', makeOrBuy: 'BUY', unitCost: 120000, moq: 20, orderMultiple: 5, leadTimeDays: 21, safetyStock: 10, reorderPoint: 20, minStockLevel: 5, lifecycleStatus: 'ACTIVE', isCritical: 'TRUE', ndaaCompliant: 'TRUE', countryOfOrigin: 'TW' },
    ],
    notes: [
      'Import Parts TRUOC KHI import BOM, Inventory, PartSupplier',
      'Ma vat tu (partNumber) phai duy nhat, khong trung',
      'makeOrBuy = MAKE: Can co BOM dinh muc',
      'makeOrBuy = BUY: Can co Supplier lien ket',
      'MOQ = So luong dat hang toi thieu (MRP se su dung)',
      'orderMultiple = Boi so dat hang (VD: chi dat theo boi 10)',
    ],
  },

  // -----------------------------------------------------------------------
  // 4. PART-SUPPLIER (Gia mua tu NCC)
  // -----------------------------------------------------------------------
  {
    fileName: 'TEMPLATE_PartSupplier.xlsx',
    sheetName: 'PartSupplier',
    title: 'LIEN KET VAT TU - NCC (PART-SUPPLIER)',
    description: 'Nhap gia mua vat tu tu tung NCC',
    importOrder: 4,
    columns: [
      { field: 'partNumber', header: 'Ma vat tu', dbField: 'partId (lookup)', type: 'text', required: true, description: 'Ma vat tu (phai ton tai trong Parts)', example: 'PRT-MT-001', width: 16 },
      { field: 'supplierCode', header: 'Ma NCC', dbField: 'supplierId (lookup)', type: 'text', required: true, description: 'Ma NCC (phai ton tai trong Suppliers)', example: 'SUP-001', width: 12 },
      { field: 'supplierPartNo', header: 'Ma NCC cho part', dbField: 'supplierPartNo', type: 'text', required: false, description: 'Ma vat tu cua NCC', example: 'ABC-12345', width: 18 },
      { field: 'unitPrice', header: 'Don gia', dbField: 'unitPrice', type: 'number', required: true, description: 'Don gia mua (VND)', example: '45000', width: 12 },
      { field: 'currency', header: 'Tien te', dbField: 'currency', type: 'text', required: false, description: 'Loai tien te', example: 'VND', allowedValues: ['VND', 'USD', 'EUR', 'JPY', 'CNY'], defaultValue: 'VND', width: 10 },
      { field: 'minOrderQty', header: 'MOQ NCC', dbField: 'minOrderQty', type: 'number', required: false, description: 'MOQ cua NCC cho part nay', example: '100', defaultValue: '1', width: 12 },
      { field: 'leadTimeDays', header: 'Lead time (ngay)', dbField: 'leadTimeDays', type: 'number', required: true, description: 'Thoi gian giao hang (ngay)', example: '10', width: 18 },
      { field: 'isPreferred', header: 'NCC uu tien', dbField: 'isPreferred', type: 'boolean', required: false, description: 'TRUE = NCC uu tien (chinh)', example: 'TRUE', allowedValues: ['TRUE', 'FALSE'], defaultValue: 'FALSE', width: 12 },
      { field: 'notes', header: 'Ghi chu', dbField: 'notes', type: 'text', required: false, description: 'Ghi chu them', example: '', width: 25 },
    ],
    exampleData: [
      { partNumber: 'PRT-MT-001', supplierCode: 'SUP-001', supplierPartNo: 'ABC-MT-12V', unitPrice: 45000, currency: 'VND', minOrderQty: 100, leadTimeDays: 10, isPreferred: 'TRUE', notes: 'NCC chinh' },
      { partNumber: 'PRT-MT-001', supplierCode: 'SUP-003', supplierPartNo: 'DK-MT12V3K', unitPrice: 55000, currency: 'VND', minOrderQty: 50, leadTimeDays: 30, isPreferred: 'FALSE', notes: 'NCC phu (Digikey)' },
      { partNumber: 'PRT-SEN-001', supplierCode: 'SUP-001', supplierPartNo: 'ABC-PRX-5V', unitPrice: 22000, currency: 'VND', minOrderQty: 50, leadTimeDays: 7, isPreferred: 'TRUE', notes: '' },
    ],
    notes: [
      'Import PartSupplier SAU KHI import Parts va Suppliers',
      'partNumber phai ton tai trong bang Parts',
      'supplierCode phai ton tai trong bang Suppliers',
      'Moi dong = 1 cap part-supplier (co the co nhieu NCC cho 1 part)',
      'Chi 1 NCC uu tien (isPreferred = TRUE) cho moi part',
    ],
  },

  // -----------------------------------------------------------------------
  // 5. PART PLANNING (MOQ, Lead time, Safety stock)
  // -----------------------------------------------------------------------
  {
    fileName: 'TEMPLATE_PartPlanning.xlsx',
    sheetName: 'PartPlanning',
    title: 'KE HOACH VAT TU (PART PLANNING)',
    description: 'Nhap thong so ke hoach: MOQ, lead time, safety stock',
    importOrder: 5,
    columns: [
      { field: 'partNumber', header: 'Ma vat tu', dbField: 'partId (lookup)', type: 'text', required: true, description: 'Ma vat tu (phai ton tai trong Parts)', example: 'PRT-MT-001', width: 16 },
      { field: 'minStockLevel', header: 'Ton kho toi thieu', dbField: 'minStockLevel', type: 'number', required: false, description: 'Muc ton kho toi thieu', example: '20', defaultValue: '0', width: 18 },
      { field: 'maxStock', header: 'Ton kho toi da', dbField: 'maxStock', type: 'number', required: false, description: 'Muc ton kho toi da', example: '500', width: 16 },
      { field: 'reorderPoint', header: 'Diem dat hang', dbField: 'reorderPoint', type: 'number', required: false, description: 'Khi ton kho <= so nay, can dat hang', example: '100', defaultValue: '0', width: 14 },
      { field: 'safetyStock', header: 'Ton kho an toan', dbField: 'safetyStock', type: 'number', required: false, description: 'So luong du phong', example: '50', defaultValue: '0', width: 16 },
      { field: 'leadTimeDays', header: 'Lead time (ngay)', dbField: 'leadTimeDays', type: 'number', required: false, description: 'Thoi gian cho (ngay)', example: '14', defaultValue: '14', width: 18 },
      { field: 'moq', header: 'MOQ', dbField: 'moq', type: 'number', required: false, description: 'So luong dat hang toi thieu', example: '100', defaultValue: '1', width: 10 },
      { field: 'orderMultiple', header: 'Boi so DH', dbField: 'orderMultiple', type: 'number', required: false, description: 'Boi so dat hang', example: '10', defaultValue: '1', width: 12 },
      { field: 'standardPack', header: 'Dong goi tieu chuan', dbField: 'standardPack', type: 'number', required: false, description: 'So luong / dong goi', example: '50', defaultValue: '1', width: 20 },
      { field: 'makeOrBuy', header: 'Tu SX/Mua', dbField: 'makeOrBuy', type: 'text', required: false, description: 'MAKE hoac BUY', example: 'BUY', allowedValues: ['MAKE', 'BUY'], width: 12 },
      { field: 'buyerCode', header: 'Ma nguoi mua', dbField: 'buyerCode', type: 'text', required: false, description: 'Ma nhan vien mua hang', example: 'BUYER01', width: 14 },
    ],
    exampleData: [
      { partNumber: 'PRT-MT-001', minStockLevel: 20, maxStock: 500, reorderPoint: 100, safetyStock: 50, leadTimeDays: 14, moq: 100, orderMultiple: 10, standardPack: 50, makeOrBuy: 'BUY', buyerCode: 'BUYER01' },
      { partNumber: 'PRT-SEN-001', minStockLevel: 10, maxStock: 200, reorderPoint: 40, safetyStock: 20, leadTimeDays: 7, moq: 50, orderMultiple: 1, standardPack: 25, makeOrBuy: 'BUY', buyerCode: 'BUYER01' },
      { partNumber: 'SA-FRAME-01', minStockLevel: 5, maxStock: 50, reorderPoint: 10, safetyStock: 5, leadTimeDays: 3, moq: 10, orderMultiple: 1, standardPack: 1, makeOrBuy: 'MAKE', buyerCode: '' },
    ],
    notes: [
      'Import PartPlanning SAU KHI import Parts',
      'Du lieu nay bo sung thong so ke hoach cho MRP',
      'MOQ va orderMultiple anh huong den goi y dat hang cua MRP',
      'safetyStock la so luong du phong, MRP se tinh vao nhu cau',
    ],
  },

  // -----------------------------------------------------------------------
  // 6. BOM (Dinh muc san pham)
  // -----------------------------------------------------------------------
  {
    fileName: 'TEMPLATE_BOM.xlsx',
    sheetName: 'BOM',
    title: 'DINH MUC SAN PHAM (BOM)',
    description: 'Nhap dinh muc vat tu cho san pham',
    importOrder: 6,
    columns: [
      { field: 'productCode', header: 'Ma thanh pham', dbField: 'productId (lookup)', type: 'text', required: true, description: 'Ma san pham (partNumber cua MAKE)', example: 'SA-FRAME-01', width: 16 },
      { field: 'bomVersion', header: 'Phien ban BOM', dbField: 'version', type: 'text', required: true, description: 'Phien ban dinh muc', example: '1.0', width: 16 },
      { field: 'lineNumber', header: 'STT', dbField: 'lineNumber', type: 'number', required: true, description: 'So thu tu dong', example: '10', width: 8 },
      { field: 'componentCode', header: 'Ma linh kien', dbField: 'partId (lookup)', type: 'text', required: true, description: 'Ma vat tu con (phai ton tai trong Parts)', example: 'PRT-MT-001', width: 16 },
      { field: 'quantity', header: 'So luong', dbField: 'quantity', type: 'number', required: true, description: 'So luong can cho 1 san pham', example: '4', width: 10 },
      { field: 'unit', header: 'Don vi', dbField: 'unit', type: 'text', required: false, description: 'Don vi tinh', example: 'PCS', defaultValue: 'PCS', width: 8 },
      { field: 'scrapRate', header: 'Ti le hao hut (%)', dbField: 'scrapRate', type: 'number', required: false, description: 'Ti le hao hut (0.05 = 5%)', example: '0.05', defaultValue: '0', width: 18 },
      { field: 'position', header: 'Vi tri lap', dbField: 'position', type: 'text', required: false, description: 'Vi tri tren san pham', example: 'Motor Bay 1', width: 15 },
      { field: 'notes', header: 'Ghi chu', dbField: 'notes', type: 'text', required: false, description: 'Ghi chu', example: '', width: 25 },
    ],
    exampleData: [
      { productCode: 'SA-FRAME-01', bomVersion: '1.0', lineNumber: 10, componentCode: 'PRT-MT-001', quantity: 4, unit: 'PCS', scrapRate: 0.02, position: 'Motor Bay 1-4', notes: '4 motor cho 4 canh' },
      { productCode: 'SA-FRAME-01', bomVersion: '1.0', lineNumber: 20, componentCode: 'PRT-SEN-001', quantity: 2, unit: 'PCS', scrapRate: 0, position: 'Sensor Mount', notes: '' },
      { productCode: 'SA-FRAME-01', bomVersion: '1.0', lineNumber: 30, componentCode: 'PRT-PCB-001', quantity: 1, unit: 'PCS', scrapRate: 0.05, position: 'Main Bay', notes: 'Board dieu khien chinh' },
    ],
    notes: [
      'Import BOM SAU KHI import Parts',
      'productCode phai la ma vat tu co makeOrBuy = MAKE',
      'componentCode phai ton tai trong bang Parts',
      'Moi dong = 1 linh kien trong BOM',
      'Cung productCode + bomVersion = 1 BOM',
      'scrapRate: 0.05 = 5% hao hut (MRP tinh them vao nhu cau)',
      'lineNumber nen tang theo boi 10 (10, 20, 30...)',
    ],
  },

  // -----------------------------------------------------------------------
  // 7. INVENTORY (Ton kho)
  // -----------------------------------------------------------------------
  {
    fileName: 'TEMPLATE_Inventory.xlsx',
    sheetName: 'Inventory',
    title: 'TON KHO (INVENTORY)',
    description: 'Nhap so luong ton kho hien tai',
    importOrder: 7,
    columns: [
      { field: 'partNumber', header: 'Ma vat tu', dbField: 'partId (lookup)', type: 'text', required: true, description: 'Ma vat tu (phai ton tai trong Parts)', example: 'PRT-MT-001', width: 16 },
      { field: 'warehouseCode', header: 'Ma kho', dbField: 'warehouseId (lookup)', type: 'text', required: true, description: 'Ma kho (phai ton tai trong Warehouses)', example: 'WH-MAIN', width: 14 },
      { field: 'quantity', header: 'So luong', dbField: 'quantity', type: 'number', required: true, description: 'So luong ton kho', example: '150', width: 10 },
      { field: 'lotNumber', header: 'So lo', dbField: 'lotNumber', type: 'text', required: false, description: 'Ma so lo hang', example: 'LOT-2024-001', width: 16 },
      { field: 'locationCode', header: 'Vi tri ke', dbField: 'locationCode', type: 'text', required: false, description: 'Vi tri ke hang trong kho', example: 'A1-B2-C3', width: 14 },
      { field: 'expiryDate', header: 'Ngay het han', dbField: 'expiryDate', type: 'date', required: false, description: 'Ngay het han (YYYY-MM-DD)', example: '2025-12-31', width: 14 },
    ],
    exampleData: [
      { partNumber: 'PRT-MT-001', warehouseCode: 'WH-MAIN', quantity: 150, lotNumber: 'LOT-2024-001', locationCode: 'A1-B2', expiryDate: '' },
      { partNumber: 'PRT-MT-001', warehouseCode: 'WH-WIP', quantity: 20, lotNumber: '', locationCode: '', expiryDate: '' },
      { partNumber: 'PRT-SEN-001', warehouseCode: 'WH-MAIN', quantity: 80, lotNumber: 'LOT-2024-015', locationCode: 'C2-D1', expiryDate: '2026-06-30' },
      { partNumber: 'SA-FRAME-01', warehouseCode: 'WH-FG', quantity: 12, lotNumber: '', locationCode: 'FG-01', expiryDate: '' },
    ],
    notes: [
      'Import Inventory SAU KHI import Parts va Warehouses',
      'partNumber phai ton tai trong bang Parts',
      'warehouseCode phai ton tai trong bang Warehouses',
      'Cung part o nhieu kho -> nhap nhieu dong',
      'Cung part, cung kho, khac lot -> nhap nhieu dong',
      'expiryDate format: YYYY-MM-DD (VD: 2025-12-31)',
    ],
  },

  // -----------------------------------------------------------------------
  // 8. CUSTOMERS (Khach hang)
  // -----------------------------------------------------------------------
  {
    fileName: 'TEMPLATE_Customers.xlsx',
    sheetName: 'Customers',
    title: 'KHACH HANG (CUSTOMERS)',
    description: 'Nhap danh sach khach hang',
    importOrder: 8,
    columns: [
      { field: 'code', header: 'Ma KH', dbField: 'code', type: 'text', required: true, description: 'Ma khach hang duy nhat (unique)', example: 'CUST-001', width: 12 },
      { field: 'name', header: 'Ten KH', dbField: 'name', type: 'text', required: true, description: 'Ten cong ty / khach hang', example: 'Cong ty TNHH DEF', width: 30 },
      { field: 'type', header: 'Loai KH', dbField: 'type', type: 'text', required: false, description: 'Phan loai khach hang', example: 'ENTERPRISE', allowedValues: ['ENTERPRISE', 'SME', 'GOVERNMENT', 'INDIVIDUAL'], width: 14 },
      { field: 'country', header: 'Quoc gia', dbField: 'country', type: 'text', required: false, description: 'Quoc gia', example: 'VN', width: 10 },
      { field: 'contactName', header: 'Nguoi lien he', dbField: 'contactName', type: 'text', required: false, description: 'Ten nguoi lien he', example: 'Le Van C', width: 20 },
      { field: 'contactEmail', header: 'Email', dbField: 'contactEmail', type: 'text', required: false, description: 'Email', example: 'c@def.com', width: 25 },
      { field: 'contactPhone', header: 'Dien thoai', dbField: 'contactPhone', type: 'text', required: false, description: 'So dien thoai', example: '0987654321', width: 15 },
      { field: 'billingAddress', header: 'Dia chi', dbField: 'billingAddress', type: 'text', required: false, description: 'Dia chi thanh toan', example: '789 Hai Ba Trung, Q1, HCM', width: 35 },
      { field: 'paymentTerms', header: 'Dieu khoan TT', dbField: 'paymentTerms', type: 'text', required: false, description: 'Dieu khoan thanh toan', example: 'NET30', allowedValues: ['COD', 'NET15', 'NET30', 'NET45', 'NET60'], width: 15 },
      { field: 'creditLimit', header: 'Han muc tin dung', dbField: 'creditLimit', type: 'number', required: false, description: 'Han muc tin dung (VND)', example: '100000000', width: 18 },
    ],
    exampleData: [
      { code: 'CUST-001', name: 'Cong ty TNHH DEF', type: 'ENTERPRISE', country: 'VN', contactName: 'Le Van C', contactEmail: 'c@def.com', contactPhone: '0987654321', billingAddress: '789 Hai Ba Trung, Q1, HCM', paymentTerms: 'NET30', creditLimit: 100000000 },
      { code: 'CUST-002', name: 'Vietnam Defense Corp', type: 'GOVERNMENT', country: 'VN', contactName: 'Pham Quoc D', contactEmail: 'd@vdc.gov.vn', contactPhone: '0281234567', billingAddress: 'Ha Noi', paymentTerms: 'NET60', creditLimit: 500000000 },
    ],
    notes: [
      'Ma KH (code) phai duy nhat',
      'creditLimit la han muc tin dung toi da (VND)',
    ],
  },
];

// ============================================================================
// GENERATION ENGINE
// ============================================================================

function generateTemplate(config: TemplateConfig): void {
  const wb = XLSX.utils.book_new();

  // --- Sheet 1: DATA ---
  const headers = config.columns.map((c) => c.header);
  const dataSheet = XLSX.utils.aoa_to_sheet([headers]);

  // Set column widths
  dataSheet['!cols'] = config.columns.map((c) => ({ wch: c.width || 15 }));

  XLSX.utils.book_append_sheet(wb, dataSheet, 'Data');

  // --- Sheet 2: INSTRUCTIONS ---
  const instructionRows: string[][] = [
    [`HUONG DAN NHAP LIEU - ${config.title}`],
    [''],
    [config.description],
    [''],
    ['THU TU IMPORT: ' + config.importOrder],
    [''],
    ['=== CHI TIET TUNG COT ==='],
    [''],
  ];

  config.columns.forEach((col, idx) => {
    const reqMark = col.required ? ' (BAT BUOC)' : '';
    instructionRows.push([`${idx + 1}. ${col.header} [${col.field}]${reqMark}`]);
    instructionRows.push([`   Mo ta: ${col.description}`]);
    instructionRows.push([`   Kieu du lieu: ${col.type}`]);
    instructionRows.push([`   Vi du: ${col.example}`]);
    if (col.allowedValues) {
      instructionRows.push([`   Gia tri cho phep: ${col.allowedValues.join(', ')}`]);
    }
    if (col.defaultValue) {
      instructionRows.push([`   Mac dinh: ${col.defaultValue}`]);
    }
    instructionRows.push([`   DB field: ${col.dbField}`]);
    instructionRows.push(['']);
  });

  instructionRows.push(['=== LUU Y ===']);
  instructionRows.push(['']);
  config.notes.forEach((note) => {
    instructionRows.push([`- ${note}`]);
  });

  instructionRows.push(['']);
  instructionRows.push(['=== QUY TAC CHUNG ===']);
  instructionRows.push(['']);
  instructionRows.push(['- Khong thay doi ten cot o Sheet "Data"']);
  instructionRows.push(['- Cot co danh dau BAT BUOC khong duoc de trong']);
  instructionRows.push(['- So khong co dau phay, dau cham (VD: 50000, khong phai 50,000)']);
  instructionRows.push(['- Ngay thang format: YYYY-MM-DD (VD: 2025-12-31)']);
  instructionRows.push(['- TRUE/FALSE viet hoa het']);

  const instrSheet = XLSX.utils.aoa_to_sheet(instructionRows);
  instrSheet['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, instrSheet, 'Instructions');

  // --- Sheet 3: EXAMPLE ---
  const exampleHeaders = config.columns.map((c) => c.header);
  const exampleRows = config.exampleData.map((row) =>
    config.columns.map((col) => row[col.field] ?? '')
  );

  const exampleSheet = XLSX.utils.aoa_to_sheet([exampleHeaders, ...exampleRows]);
  exampleSheet['!cols'] = config.columns.map((c) => ({ wch: c.width || 15 }));
  XLSX.utils.book_append_sheet(wb, exampleSheet, 'Example');

  // --- Write file ---
  const filePath = path.join(OUTPUT_DIR, config.fileName);
  XLSX.writeFile(wb, filePath);
  console.log(`  Generated: ${config.fileName}`);
}

function main() {
  // Ensure output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created: ${OUTPUT_DIR}`);
  }

  console.log('');
  console.log('=== GENERATING MASTER DATA TEMPLATES ===');
  console.log('');

  // Sort by import order
  const sorted = [...TEMPLATES].sort((a, b) => a.importOrder - b.importOrder);

  for (const template of sorted) {
    generateTemplate(template);
  }

  console.log('');
  console.log(`Done! ${TEMPLATES.length} templates generated in ${OUTPUT_DIR}`);
  console.log('');
  console.log('Import order:');
  sorted.forEach((t) => {
    console.log(`  ${t.importOrder}. ${t.fileName.replace('TEMPLATE_', '').replace('.xlsx', '')}`);
  });
}

main();
