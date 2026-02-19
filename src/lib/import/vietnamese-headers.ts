// src/lib/import/vietnamese-headers.ts
// Comprehensive Vietnamese Header Dictionary for AI Smart Import
// This extends the existing excel/mapper.ts aliases with more comprehensive coverage

export interface HeaderMatch {
  field: string;
  confidence: number;
  isVietnamese: boolean;
  originalAlias?: string;
}

/**
 * Comprehensive Vietnamese-English header mapping dictionary
 * Organized by entity type and field
 */
export const VIETNAMESE_HEADER_MAP: Record<string, Record<string, string[]>> = {
  // ============================================
  // PARTS / LINH KIỆN / VẬT TƯ
  // ============================================
  parts: {
    partNumber: [
      // English variations
      'part number', 'part_number', 'part no', 'partno', 'pn', 'item number', 'item_number',
      'item code', 'item_code', 'sku', 'code', 'material code', 'mat code', 'part id',
      // Vietnamese variations (with and without diacritics)
      'mã sp', 'ma sp', 'mã sản phẩm', 'ma san pham', 'mã hàng', 'ma hang',
      'mã linh kiện', 'ma linh kien', 'mã vật tư', 'ma vat tu', 'mã phụ tùng', 'ma phu tung',
      'mã nguyên liệu', 'ma nguyen lieu', 'mã nlvl', 'mã nk', 'số hiệu', 'so hieu',
      'mã', 'ma', 'msp', 'masp', 'mã lk', 'mlk',
    ],
    name: [
      // English
      'name', 'part name', 'description', 'desc', 'item name', 'product name',
      'material name', 'component name', 'title',
      // Vietnamese
      'tên', 'ten', 'tên sp', 'ten sp', 'tên sản phẩm', 'ten san pham',
      'tên hàng', 'ten hang', 'tên linh kiện', 'ten linh kien',
      'tên vật tư', 'ten vat tu', 'diễn giải', 'dien giai',
      'mô tả', 'mo ta', 'tên nguyên liệu', 'ten nguyen lieu',
    ],
    category: [
      // English
      'category', 'type', 'group', 'part type', 'item type', 'class', 'classification',
      // Vietnamese
      'nhóm', 'nhom', 'nhóm hàng', 'nhom hang', 'loại', 'loai',
      'phân loại', 'phan loai', 'danh mục', 'danh muc', 'nhóm sp', 'nhom sp',
      'chủng loại', 'chung loai', 'danh mục sp', 'danh muc sp',
    ],
    unit: [
      // English
      'unit', 'uom', 'unit of measure', 'measure', 'measure unit',
      // Vietnamese
      'đvt', 'dvt', 'đơn vị', 'don vi', 'đơn vị tính', 'don vi tinh',
      'đơn vị đo', 'don vi do', 'đơn vị đo lường', 'don vi do luong',
    ],
    unitCost: [
      // English
      'cost', 'unit cost', 'price', 'unit price', 'standard cost', 'purchase price',
      'buying price', 'material cost', 'item cost',
      // Vietnamese
      'giá', 'gia', 'đơn giá', 'don gia', 'giá nhập', 'gia nhap',
      'giá mua', 'gia mua', 'giá vốn', 'gia von', 'chi phí', 'chi phi',
      'giá đơn vị', 'gia don vi', 'đơn giá nhập', 'don gia nhap',
      'giá thành', 'gia thanh',
    ],
    unitPrice: [
      // English
      'selling price', 'sale price', 'list price', 'retail price',
      // Vietnamese
      'giá bán', 'gia ban', 'đơn giá bán', 'don gia ban',
      'giá niêm yết', 'gia niem yet', 'giá bán lẻ', 'gia ban le',
    ],
    quantityOnHand: [
      // English
      'qty', 'quantity', 'on hand', 'stock', 'stock qty', 'available qty',
      'current stock', 'inventory', 'balance',
      // Vietnamese
      'tồn kho', 'ton kho', 'sl tồn', 'sl ton', 'số lượng tồn', 'so luong ton',
      'tồn', 'ton', 'số lượng', 'so luong', 'sl', 'tồn hiện tại', 'ton hien tai',
      'tồn thực tế', 'ton thuc te',
    ],
    reorderPoint: [
      // English
      'reorder point', 'rop', 'reorder level', 'reorder qty', 'min stock',
      // Vietnamese
      'mức đặt hàng lại', 'muc dat hang lai', 'điểm đặt hàng', 'diem dat hang',
      'rop', 'mức tái đặt hàng', 'muc tai dat hang', 'ngưỡng đặt hàng', 'nguong dat hang',
    ],
    leadTime: [
      // English
      'lead time', 'lt', 'delivery time', 'procurement time', 'days',
      // Vietnamese
      'thời gian giao hàng', 'thoi gian giao hang', 'lt', 'ngày giao hàng', 'ngay giao hang',
      'thời gian chờ', 'thoi gian cho', 'thời gian đặt hàng', 'thoi gian dat hang',
    ],
    moq: [
      // English
      'moq', 'min qty', 'minimum order qty', 'minimum order', 'min order qty',
      // Vietnamese
      'đặt hàng tối thiểu', 'dat hang toi thieu', 'sl tối thiểu', 'sl toi thieu',
      'moq', 'số lượng tối thiểu', 'so luong toi thieu', 'đặt tối thiểu', 'dat toi thieu',
    ],
    location: [
      // English
      'location', 'bin', 'shelf', 'rack', 'storage location', 'warehouse location',
      // Vietnamese
      'vị trí', 'vi tri', 'vị trí kho', 'vi tri kho', 'kệ', 'ke',
      'ô kệ', 'o ke', 'ngăn kệ', 'ngan ke', 'giá', 'gia',
    ],
    notes: [
      // English
      'notes', 'note', 'remarks', 'comment', 'comments', 'memo',
      // Vietnamese
      'ghi chú', 'ghi chu', 'chú thích', 'chu thich', 'note', 'ghi nhận', 'ghi nhan',
    ],
    weight: [
      // English
      'weight', 'weight kg', 'net weight', 'gross weight', 'wt',
      // Vietnamese
      'trọng lượng', 'trong luong', 'cân nặng', 'can nang', 'khối lượng', 'khoi luong',
    ],
    status: [
      // English
      'status', 'state', 'active',
      // Vietnamese
      'trạng thái', 'trang thai', 'tình trạng', 'tinh trang',
    ],
  },

  // ============================================
  // SUPPLIERS / NHÀ CUNG CẤP
  // ============================================
  suppliers: {
    supplierName: [
      // English
      'supplier', 'supplier name', 'vendor', 'vendor name', 'company', 'company name',
      // Vietnamese
      'nhà cung cấp', 'nha cung cap', 'ncc', 'tên ncc', 'ten ncc',
      'tên nhà cung cấp', 'ten nha cung cap', 'công ty', 'cong ty',
      'đối tác', 'doi tac',
    ],
    supplierCode: [
      // English
      'supplier code', 'vendor code', 'supplier id', 'vendor id',
      // Vietnamese
      'mã ncc', 'ma ncc', 'mã nhà cung cấp', 'ma nha cung cap',
      'mã đối tác', 'ma doi tac',
    ],
    contactName: [
      // English
      'contact', 'contact name', 'contact person', 'representative',
      // Vietnamese
      'người liên hệ', 'nguoi lien he', 'liên hệ', 'lien he',
      'đại diện', 'dai dien', 'người đại diện', 'nguoi dai dien',
    ],
    phone: [
      // English
      'phone', 'telephone', 'tel', 'mobile', 'cell', 'phone number',
      // Vietnamese
      'điện thoại', 'dien thoai', 'sđt', 'sdt', 'số điện thoại', 'so dien thoai',
      'dt', 'đt', 'tel',
    ],
    email: [
      // English
      'email', 'e-mail', 'mail', 'email address',
      // Vietnamese
      'email', 'thư điện tử', 'thu dien tu', 'e-mail',
    ],
    address: [
      // English
      'address', 'addr', 'location', 'street address', 'full address',
      // Vietnamese
      'địa chỉ', 'dia chi', 'đ/c', 'd/c', 'đchi', 'dchi',
    ],
    taxId: [
      // English
      'tax id', 'tax code', 'tax number', 'vat number', 'tin',
      // Vietnamese
      'mã số thuế', 'ma so thue', 'mst', 'msdn', 'tax id',
      'mã thuế', 'ma thue',
    ],
    paymentTerms: [
      // English
      'payment terms', 'payment', 'terms', 'payment days',
      // Vietnamese
      'điều khoản thanh toán', 'dieu khoan thanh toan',
      'thanh toán', 'thanh toan', 'công nợ', 'cong no',
    ],
    rating: [
      // English
      'rating', 'score', 'grade', 'evaluation',
      // Vietnamese
      'đánh giá', 'danh gia', 'điểm', 'diem', 'xếp hạng', 'xep hang',
    ],
  },

  // ============================================
  // BOM / ĐỊNH MỨC VẬT TƯ
  // ============================================
  bom: {
    parentPart: [
      // English
      'parent', 'parent part', 'finished good', 'assembly', 'fg', 'product',
      // Vietnamese
      'sản phẩm cha', 'san pham cha', 'sp cha', 'thành phẩm', 'thanh pham',
      'tp', 'sản phẩm', 'san pham', 'mã tp', 'ma tp',
    ],
    childPart: [
      // English
      'child', 'child part', 'component', 'material', 'raw material', 'sub-component',
      // Vietnamese
      'linh kiện', 'linh kien', 'vật tư', 'vat tu', 'nguyên liệu', 'nguyen lieu',
      'lk', 'nlvl', 'component', 'thành phần', 'thanh phan',
    ],
    bomQuantity: [
      // English
      'qty', 'quantity', 'qty per', 'quantity per', 'bom qty', 'usage qty',
      // Vietnamese
      'số lượng', 'so luong', 'sl', 'định mức', 'dinh muc',
      'sl/sp', 'sl cần', 'sl can',
    ],
    scrapRate: [
      // English
      'scrap', 'scrap rate', 'scrap %', 'waste', 'waste %', 'loss',
      // Vietnamese
      'tỷ lệ hao hụt', 'ty le hao hut', 'hao hụt', 'hao hut',
      '% hao hụt', 'phần trăm hao', 'phan tram hao',
    ],
    level: [
      // English
      'level', 'bom level', 'hierarchy',
      // Vietnamese
      'cấp', 'cap', 'cấp độ', 'cap do', 'tầng', 'tang',
    ],
  },

  // ============================================
  // INVENTORY / TỒN KHO
  // ============================================
  inventory: {
    lotNumber: [
      // English
      'lot', 'lot no', 'lot number', 'batch', 'batch no', 'batch number',
      // Vietnamese
      'số lô', 'so lo', 'lô', 'lo', 'số batch', 'so batch',
      'mã lô', 'ma lo',
    ],
    expiryDate: [
      // English
      'expiry', 'expiry date', 'exp date', 'expiration', 'best before', 'shelf life end',
      // Vietnamese
      'hạn sử dụng', 'han su dung', 'ngày hết hạn', 'ngay het han',
      'hsd', 'ngày hạn', 'ngay han',
    ],
    receivedDate: [
      // English
      'received date', 'date received', 'receipt date', 'received',
      // Vietnamese
      'ngày nhập', 'ngay nhap', 'ngày nhận', 'ngay nhan',
      'ngày nhập kho', 'ngay nhap kho',
    ],
    warehouse: [
      // English
      'warehouse', 'wh', 'store', 'storage', 'depot',
      // Vietnamese
      'kho', 'nhà kho', 'nha kho', 'kho hàng', 'kho hang',
      'tên kho', 'ten kho', 'mã kho', 'ma kho',
    ],
  },

  // ============================================
  // PURCHASE ORDERS / ĐƠN MUA HÀNG
  // ============================================
  purchaseOrders: {
    poNumber: [
      // English
      'po', 'po number', 'po no', 'purchase order', 'order number', 'order no',
      // Vietnamese
      'số po', 'so po', 'mã po', 'ma po', 'số đơn hàng', 'so don hang',
      'số đơn mua', 'so don mua', 'đơn hàng', 'don hang',
    ],
    orderDate: [
      // English
      'order date', 'po date', 'date', 'ordered', 'purchase date',
      // Vietnamese
      'ngày đặt', 'ngay dat', 'ngày đặt hàng', 'ngay dat hang',
      'ngày po', 'ngay po', 'ngày tạo', 'ngay tao',
    ],
    expectedDate: [
      // English
      'expected date', 'delivery date', 'due date', 'eta', 'expected delivery',
      // Vietnamese
      'ngày giao', 'ngay giao', 'ngày dự kiến', 'ngay du kien',
      'ngày giao hàng', 'ngay giao hang', 'ngày nhận dự kiến', 'ngay nhan du kien',
    ],
    totalAmount: [
      // English
      'total', 'amount', 'total amount', 'value', 'total value', 'order value',
      // Vietnamese
      'tổng tiền', 'tong tien', 'tổng', 'tong', 'giá trị', 'gia tri',
      'tổng giá trị', 'tong gia tri', 'thành tiền', 'thanh tien',
    ],
    poStatus: [
      // English
      'status', 'po status', 'order status', 'state',
      // Vietnamese
      'trạng thái', 'trang thai', 'tình trạng', 'tinh trang',
      'trạng thái đơn', 'trang thai don',
    ],
  },

  // ============================================
  // CUSTOMERS / KHÁCH HÀNG
  // ============================================
  customers: {
    customerName: [
      // English
      'customer', 'customer name', 'client', 'client name', 'company',
      // Vietnamese
      'khách hàng', 'khach hang', 'tên kh', 'ten kh', 'tên khách hàng', 'ten khach hang',
      'kh', 'công ty', 'cong ty', 'đối tác', 'doi tac',
    ],
    customerCode: [
      // English
      'customer code', 'client code', 'customer id', 'account',
      // Vietnamese
      'mã kh', 'ma kh', 'mã khách hàng', 'ma khach hang',
      'mã khách', 'ma khach',
    ],
    // Reuse contact fields from suppliers...
  },
};

/**
 * Flatten the nested structure for easier lookup
 */
export function getHeaderAliases(entityType: string): Map<string, string[]> {
  const aliasMap = new Map<string, string[]>();
  const entityHeaders = VIETNAMESE_HEADER_MAP[entityType];

  if (entityHeaders) {
    for (const [field, aliases] of Object.entries(entityHeaders)) {
      aliasMap.set(field, aliases);
    }
  }

  return aliasMap;
}

/**
 * Get all aliases across all entity types
 */
export function getAllAliases(): Map<string, { field: string; entityType: string }[]> {
  const aliasLookup = new Map<string, { field: string; entityType: string }[]>();

  for (const [entityType, fields] of Object.entries(VIETNAMESE_HEADER_MAP)) {
    for (const [field, aliases] of Object.entries(fields)) {
      for (const alias of aliases) {
        const normalized = normalizeVietnamese(alias);
        const existing = aliasLookup.get(normalized) || [];
        existing.push({ field, entityType });
        aliasLookup.set(normalized, existing);
      }
    }
  }

  return aliasLookup;
}

/**
 * Normalize Vietnamese text for matching
 * - Lowercases
 * - Removes diacritics (accents)
 * - Normalizes whitespace
 */
export function normalizeVietnamese(text: string): string {
  if (!text) return '';

  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    // Remove Vietnamese diacritics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Handle specific Vietnamese characters
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    // Remove special characters
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find the best matching field for a header
 */
export function findBestMatch(
  header: string,
  entityType?: string
): HeaderMatch | null {
  const normalizedHeader = normalizeVietnamese(header);

  if (!normalizedHeader) return null;

  // If entity type is specified, search only that type first
  const entityTypes = entityType
    ? [entityType, ...Object.keys(VIETNAMESE_HEADER_MAP).filter(t => t !== entityType)]
    : Object.keys(VIETNAMESE_HEADER_MAP);

  for (const type of entityTypes) {
    const fields = VIETNAMESE_HEADER_MAP[type];
    if (!fields) continue;

    for (const [field, aliases] of Object.entries(fields)) {
      for (const alias of aliases) {
        const normalizedAlias = normalizeVietnamese(alias);

        // Exact match - highest confidence
        if (normalizedHeader === normalizedAlias) {
          return {
            field,
            confidence: 1.0,
            isVietnamese: isVietnameseText(alias),
            originalAlias: alias,
          };
        }

        // Header contains alias exactly (e.g., "mã sp" in "mã sp (code)")
        if (normalizedHeader.includes(normalizedAlias) && normalizedAlias.length >= 3) {
          return {
            field,
            confidence: 0.9,
            isVietnamese: isVietnameseText(alias),
            originalAlias: alias,
          };
        }

        // Alias contains header (e.g., "mã" matches "mã sản phẩm")
        if (normalizedAlias.includes(normalizedHeader) && normalizedHeader.length >= 2) {
          return {
            field,
            confidence: 0.75,
            isVietnamese: isVietnameseText(alias),
            originalAlias: alias,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Check if text contains Vietnamese characters
 */
export function isVietnameseText(text: string): boolean {
  // Vietnamese specific characters (with diacritics)
  const vietnamesePattern = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
  return vietnamesePattern.test(text);
}

/**
 * Detect entity type from headers
 */
export function detectEntityType(headers: string[]): { type: string; confidence: number } {
  const scores: Record<string, number> = {};

  for (const header of headers) {
    const match = findBestMatch(header);
    if (!match) continue;

    // Find which entity types have this field
    for (const [entityType, fields] of Object.entries(VIETNAMESE_HEADER_MAP)) {
      if (fields[match.field]) {
        scores[entityType] = (scores[entityType] || 0) + match.confidence;
      }
    }
  }

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return { type: 'unknown', confidence: 0 };
  }

  const [bestType, bestScore] = entries[0];
  const maxPossibleScore = headers.length; // If all headers matched perfectly
  const confidence = Math.min(bestScore / Math.max(maxPossibleScore * 0.5, 1), 1);

  return { type: bestType, confidence };
}

/**
 * Auto-map headers to fields for a specific entity type
 */
export function autoMapHeaders(
  headers: string[],
  entityType: string
): Map<string, HeaderMatch> {
  const mappings = new Map<string, HeaderMatch>();
  const usedFields = new Set<string>();

  for (const header of headers) {
    const match = findBestMatch(header, entityType);

    if (match && !usedFields.has(match.field)) {
      mappings.set(header, match);
      usedFields.add(match.field);
    }
  }

  return mappings;
}

/**
 * Get Vietnamese translation for a field name
 */
export function getVietnameseLabel(field: string, entityType?: string): string | null {
  const labelMap: Record<string, string> = {
    // Parts
    partNumber: 'Mã sản phẩm',
    name: 'Tên',
    category: 'Nhóm hàng',
    unit: 'Đơn vị tính',
    unitCost: 'Đơn giá nhập',
    unitPrice: 'Đơn giá bán',
    quantityOnHand: 'Tồn kho',
    reorderPoint: 'Mức đặt hàng lại',
    leadTime: 'Thời gian giao hàng',
    moq: 'Đặt hàng tối thiểu',
    location: 'Vị trí kho',
    notes: 'Ghi chú',
    weight: 'Trọng lượng',
    status: 'Trạng thái',
    // Suppliers
    supplierName: 'Tên nhà cung cấp',
    supplierCode: 'Mã nhà cung cấp',
    contactName: 'Người liên hệ',
    phone: 'Điện thoại',
    email: 'Email',
    address: 'Địa chỉ',
    taxId: 'Mã số thuế',
    paymentTerms: 'Điều khoản thanh toán',
    rating: 'Đánh giá',
    // BOM
    parentPart: 'Thành phẩm',
    childPart: 'Linh kiện',
    bomQuantity: 'Định mức',
    scrapRate: 'Tỷ lệ hao hụt',
    level: 'Cấp độ',
    // Inventory
    lotNumber: 'Số lô',
    expiryDate: 'Hạn sử dụng',
    receivedDate: 'Ngày nhập',
    warehouse: 'Kho',
    // Purchase Orders
    poNumber: 'Số PO',
    orderDate: 'Ngày đặt hàng',
    expectedDate: 'Ngày giao dự kiến',
    totalAmount: 'Tổng tiền',
    poStatus: 'Trạng thái',
    // Customers
    customerName: 'Tên khách hàng',
    customerCode: 'Mã khách hàng',
  };

  return labelMap[field] || null;
}

export default {
  VIETNAMESE_HEADER_MAP,
  normalizeVietnamese,
  findBestMatch,
  detectEntityType,
  autoMapHeaders,
  getVietnameseLabel,
  isVietnameseText,
  getHeaderAliases,
  getAllAliases,
};
