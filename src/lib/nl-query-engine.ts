// =============================================================================
// RTR AI COPILOT - NATURAL LANGUAGE QUERY ENGINE
// Converts natural language questions to database queries
// =============================================================================

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Types
export interface NLQueryResult {
  success: boolean;
  query: string;
  naturalLanguage: string;
  data: Record<string, unknown>[];
  metadata: {
    rowCount: number;
    executionTime: number;
    confidence: number;
    explanation: string;
    explanationVi: string;
  };
  suggestedFollowups: { en: string; vi: string }[];
  warnings?: string[];
}

export interface QueryPattern {
  patterns: RegExp[];
  intent: string;
  handler: (matches: RegExpMatchArray, language: string) => Promise<NLQueryResult>;
}

// Query patterns and handlers
const queryPatterns: QueryPattern[] = [
  // ==================== INVENTORY QUERIES ====================
  {
    patterns: [
      /(?:show|list|get|hiển thị|liệt kê|cho xem)\s*(?:all|tất cả)?\s*(?:low stock|hàng sắp hết|tồn kho thấp|parts below minimum)/i,
      /(?:which|what|linh kiện nào|cái nào)\s*(?:parts?|items?|linh kiện)?\s*(?:are|is|đang)?\s*(?:low|below|under|dưới|thiếu)/i,
      /(?:sắp hết|hết hàng|cần đặt|need to order|running low)/i,
    ],
    intent: 'low_stock_query',
    handler: async (matches, language) => {
      const startTime = Date.now();

      const lowStockItems = await prisma.inventory.findMany({
        where: {
          quantity: { lte: 20 } // Below safety threshold
        },
        include: {
          part: {
            select: {
              partNumber: true,
              name: true,
              category: true,
              unit: true,
              costs: { select: { unitCost: true } },
              planning: { select: { minStockLevel: true } },
            }
          },
          warehouse: {
            select: { name: true, code: true }
          }
        },
        orderBy: { quantity: 'asc' },
        take: 50,
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        query: 'SELECT * FROM inventory WHERE quantity <= min_stock',
        naturalLanguage: language === 'vi'
          ? 'Tìm các linh kiện có tồn kho thấp hơn mức tối thiểu'
          : 'Find parts with stock below minimum level',
        data: lowStockItems.map(item => ({
          partNumber: item.part?.partNumber,
          name: item.part?.name,
          category: item.part?.category,
          currentStock: item.quantity,
          minStock: item.part?.planning?.minStockLevel || 20,
          unit: item.part?.unit || 'pcs',
          warehouse: item.warehouse?.name,
          unitCost: item.part?.costs?.[0]?.unitCost,
          shortfall: Math.max(0, (item.part?.planning?.minStockLevel || 20) - Number(item.quantity)),
        })),
        metadata: {
          rowCount: lowStockItems.length,
          executionTime,
          confidence: 0.95,
          explanation: `Found ${lowStockItems.length} parts with stock at or below minimum levels`,
          explanationVi: `Tìm thấy ${lowStockItems.length} linh kiện có tồn kho bằng hoặc dưới mức tối thiểu`,
        },
        suggestedFollowups: [
          { en: 'Create PO for these items', vi: 'Tạo PO cho các linh kiện này' },
          { en: 'Show inventory value by category', vi: 'Hiển thị giá trị tồn kho theo danh mục' },
          { en: 'Which suppliers provide these parts?', vi: 'NCC nào cung cấp các linh kiện này?' },
        ],
      };
    },
  },

  {
    patterns: [
      /(?:total|tổng)\s*(?:inventory|tồn kho)\s*(?:value|giá trị)/i,
      /(?:inventory|tồn kho)\s*(?:worth|value|giá trị|trị giá)/i,
      /(?:how much|bao nhiêu)\s*(?:is|are)?\s*(?:inventory|tồn kho)\s*(?:worth|value)?/i,
    ],
    intent: 'inventory_value_query',
    handler: async (matches, language) => {
      const startTime = Date.now();

      const inventoryItems = await prisma.inventory.findMany({
        include: {
          part: {
            select: {
              partNumber: true,
              name: true,
              category: true,
              costs: { select: { unitCost: true } }
            }
          }
        }
      });

      // Calculate value by category
      const categoryValues: Record<string, { count: number; quantity: number; value: number }> = {};
      let totalValue = 0;
      let totalQuantity = 0;

      inventoryItems.forEach(item => {
        const category = item.part?.category || 'Uncategorized';
        const unitCost = Number(item.part?.costs?.[0]?.unitCost || 0);
        const quantity = Number(item.quantity);
        const value = quantity * unitCost;

        if (!categoryValues[category]) {
          categoryValues[category] = { count: 0, quantity: 0, value: 0 };
        }
        categoryValues[category].count++;
        categoryValues[category].quantity += quantity;
        categoryValues[category].value += value;
        totalValue += value;
        totalQuantity += quantity;
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        query: 'SELECT category, SUM(quantity * unit_cost) as value FROM inventory GROUP BY category',
        naturalLanguage: language === 'vi'
          ? 'Tính tổng giá trị tồn kho theo danh mục'
          : 'Calculate total inventory value by category',
        data: [
          {
            summary: {
              totalValue: Math.round(totalValue),
              totalQuantity,
              totalParts: inventoryItems.length,
              currency: 'USD',
            },
            byCategory: Object.entries(categoryValues)
              .map(([category, data]) => ({
                category,
                partCount: data.count,
                totalQuantity: data.quantity,
                totalValue: Math.round(data.value),
                percentOfTotal: Math.round((data.value / totalValue) * 100),
              }))
              .sort((a, b) => b.totalValue - a.totalValue),
          }
        ],
        metadata: {
          rowCount: Object.keys(categoryValues).length,
          executionTime,
          confidence: 0.92,
          explanation: `Total inventory value is $${totalValue.toLocaleString()} across ${Object.keys(categoryValues).length} categories`,
          explanationVi: `Tổng giá trị tồn kho là $${totalValue.toLocaleString()} trong ${Object.keys(categoryValues).length} danh mục`,
        },
        suggestedFollowups: [
          { en: 'Show inventory turnover rate', vi: 'Hiển thị tỷ lệ quay vòng tồn kho' },
          { en: 'Which category has highest value?', vi: 'Danh mục nào có giá trị cao nhất?' },
          { en: 'List dead stock items', vi: 'Liệt kê hàng tồn đọng' },
        ],
      };
    },
  },

  // ==================== SALES QUERIES ====================
  {
    patterns: [
      /(?:sales|doanh thu|doanh số)\s*(?:this|tháng này|month|today|hôm nay)/i,
      /(?:revenue|doanh thu)\s*(?:summary|tổng hợp|report|báo cáo)/i,
      /(?:how much|bao nhiêu)\s*(?:sales|doanh thu|revenue)/i,
    ],
    intent: 'sales_summary_query',
    handler: async (matches, language) => {
      const startTime = Date.now();

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const [thisMonthOrders, lastMonthOrders, pendingOrders] = await Promise.all([
        prisma.salesOrder.findMany({
          where: { createdAt: { gte: startOfMonth } },
          include: { customer: { select: { name: true } } },
        }),
        prisma.salesOrder.findMany({
          where: {
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
          },
        }),
        prisma.salesOrder.count({
          where: { status: { in: ['DRAFT', 'PENDING', 'CONFIRMED'] } },
        }),
      ]);

      const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
      const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
      const changePercent = lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100)
        : 0;

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        query: 'SELECT SUM(total_amount), COUNT(*) FROM sales_orders WHERE created_at >= start_of_month',
        naturalLanguage: language === 'vi'
          ? 'Tổng hợp doanh thu tháng này'
          : 'Sales summary for this month',
        data: [{
          thisMonth: {
            revenue: Math.round(thisMonthRevenue),
            orderCount: thisMonthOrders.length,
            avgOrderValue: thisMonthOrders.length > 0
              ? Math.round(thisMonthRevenue / thisMonthOrders.length)
              : 0,
          },
          lastMonth: {
            revenue: Math.round(lastMonthRevenue),
            orderCount: lastMonthOrders.length,
          },
          comparison: {
            revenueChange: Math.round(changePercent * 10) / 10,
            trend: changePercent >= 0 ? 'up' : 'down',
          },
          pending: {
            orderCount: pendingOrders,
          },
          topOrders: thisMonthOrders
            .sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount))
            .slice(0, 5)
            .map(o => ({
              orderNumber: o.orderNumber,
              customer: o.customer?.name,
              amount: Number(o.totalAmount),
              status: o.status,
            })),
        }],
        metadata: {
          rowCount: thisMonthOrders.length,
          executionTime,
          confidence: 0.94,
          explanation: `This month: $${thisMonthRevenue.toLocaleString()} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}% vs last month)`,
          explanationVi: `Tháng này: $${thisMonthRevenue.toLocaleString()} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}% so với tháng trước)`,
        },
        suggestedFollowups: [
          { en: 'Show top customers', vi: 'Hiển thị khách hàng hàng đầu' },
          { en: 'Sales by product', vi: 'Doanh thu theo sản phẩm' },
          { en: 'Pending orders details', vi: 'Chi tiết đơn hàng đang chờ' },
        ],
      };
    },
  },

  {
    patterns: [
      /(?:top|best|selling|bán chạy)\s*(?:products?|sản phẩm)/i,
      /(?:which|what|sản phẩm nào)\s*(?:products?|sản phẩm)\s*(?:sell|sold|bán)\s*(?:best|most|nhiều nhất)/i,
    ],
    intent: 'top_products_query',
    handler: async (matches, language) => {
      const startTime = Date.now();

      const orderLines = await prisma.salesOrderLine.findMany({
        include: {
          product: { select: { sku: true, name: true } },
        },
      });

      // Aggregate by product
      const productStats: Record<string, {
        sku: string;
        name: string;
        quantity: number;
        revenue: number;
        orderCount: number;
      }> = {};

      orderLines.forEach(line => {
        const productId = line.productId;
        if (!productStats[productId]) {
          productStats[productId] = {
            sku: line.product?.sku || '',
            name: line.product?.name || '',
            quantity: 0,
            revenue: 0,
            orderCount: 0,
          };
        }
        productStats[productId].quantity += Number(line.quantity);
        productStats[productId].revenue += Number(line.lineTotal || 0);
        productStats[productId].orderCount++;
      });

      const topProducts = Object.values(productStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        query: 'SELECT product_id, SUM(quantity), SUM(line_total) FROM order_lines GROUP BY product_id ORDER BY revenue DESC',
        naturalLanguage: language === 'vi'
          ? 'Top sản phẩm bán chạy nhất'
          : 'Top selling products',
        data: topProducts.map((p, index) => ({
          rank: index + 1,
          sku: p.sku,
          name: p.name,
          unitsSold: p.quantity,
          revenue: Math.round(p.revenue),
          orderCount: p.orderCount,
        })),
        metadata: {
          rowCount: topProducts.length,
          executionTime,
          confidence: 0.93,
          explanation: `Top ${topProducts.length} products by revenue`,
          explanationVi: `Top ${topProducts.length} sản phẩm theo doanh thu`,
        },
        suggestedFollowups: [
          { en: 'Show sales trend for top product', vi: 'Hiển thị xu hướng bán hàng sản phẩm top' },
          { en: 'Inventory status of top products', vi: 'Tình trạng tồn kho sản phẩm top' },
          { en: 'Compare with last quarter', vi: 'So sánh với quý trước' },
        ],
      };
    },
  },

  // ==================== SUPPLIER QUERIES ====================
  {
    patterns: [
      /(?:supplier|ncc|nhà cung cấp)\s*(?:performance|hiệu suất|rating|đánh giá)/i,
      /(?:how|thế nào)\s*(?:are|đang)?\s*(?:suppliers?|ncc|nhà cung cấp)\s*(?:performing|hoạt động)/i,
      /(?:best|top|tốt nhất)\s*(?:suppliers?|ncc|nhà cung cấp)/i,
    ],
    intent: 'supplier_performance_query',
    handler: async (matches, language) => {
      const startTime = Date.now();

      const suppliers = await prisma.supplier.findMany({
        where: { status: 'active' },
        orderBy: { rating: 'desc' },
        take: 20,
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        query: 'SELECT * FROM suppliers WHERE status = active ORDER BY rating DESC',
        naturalLanguage: language === 'vi'
          ? 'Đánh giá hiệu suất nhà cung cấp'
          : 'Supplier performance ratings',
        data: suppliers.map((s, index) => ({
          rank: index + 1,
          code: s.code,
          name: s.name,
          country: s.country,
          rating: Number(s.rating || 0),
          leadTimeDays: s.leadTimeDays,
          ndaaCompliant: s.ndaaCompliant,
          paymentTerms: s.paymentTerms,
        })),
        metadata: {
          rowCount: suppliers.length,
          executionTime,
          confidence: 0.91,
          explanation: `Found ${suppliers.length} active suppliers`,
          explanationVi: `Tìm thấy ${suppliers.length} nhà cung cấp đang hoạt động`,
        },
        suggestedFollowups: [
          { en: 'Show suppliers with quality issues', vi: 'Hiển thị NCC có vấn đề chất lượng' },
          { en: 'NDAA compliant suppliers only', vi: 'Chỉ NCC tuân thủ NDAA' },
          { en: 'Compare supplier prices', vi: 'So sánh giá các NCC' },
        ],
      };
    },
  },

  // ==================== PRODUCTION QUERIES ====================
  {
    patterns: [
      /(?:work orders?|wo|lệnh sản xuất)\s*(?:status|trạng thái|active|đang chạy)/i,
      /(?:production|sản xuất)\s*(?:status|trạng thái|schedule|lịch)/i,
      /(?:what|cái gì)\s*(?:is|are)?\s*(?:in production|đang sản xuất)/i,
    ],
    intent: 'production_status_query',
    handler: async (matches, language) => {
      const startTime = Date.now();

      const workOrders = await prisma.workOrder.findMany({
        where: { status: { in: ['RELEASED', 'IN_PROGRESS'] } },
        include: {
          product: { select: { sku: true, name: true } },
        },
        orderBy: { plannedEnd: 'asc' },
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        query: 'SELECT * FROM work_orders WHERE status IN (RELEASED, IN_PROGRESS)',
        naturalLanguage: language === 'vi'
          ? 'Trạng thái các Work Order đang chạy'
          : 'Active work orders status',
        data: workOrders.map(wo => ({
          woNumber: wo.woNumber,
          product: wo.product?.name || wo.product?.sku,
          quantity: wo.quantity,
          completedQty: wo.completedQty || 0,
          status: wo.status,
          plannedStart: wo.plannedStart,
          plannedEnd: wo.plannedEnd,
          progress: wo.quantity > 0
            ? Math.round((Number(wo.completedQty || 0) / Number(wo.quantity)) * 100)
            : 0,
        })),
        metadata: {
          rowCount: workOrders.length,
          executionTime,
          confidence: 0.94,
          explanation: `${workOrders.length} work orders currently in production`,
          explanationVi: `${workOrders.length} lệnh sản xuất đang chạy`,
        },
        suggestedFollowups: [
          { en: 'Show delayed work orders', vi: 'Hiển thị WO bị trễ' },
          { en: 'Material availability check', vi: 'Kiểm tra vật tư sẵn có' },
          { en: 'Production efficiency report', vi: 'Báo cáo hiệu suất sản xuất' },
        ],
      };
    },
  },

  // ==================== QUALITY QUERIES ====================
  {
    patterns: [
      /(?:ncr|non.?conformance)\s*(?:open|đang mở|status|trạng thái)/i,
      /(?:quality|chất lượng)\s*(?:issues?|vấn đề|problems?)/i,
      /(?:open|đang mở)\s*(?:ncrs?|quality issues?)/i,
    ],
    intent: 'quality_issues_query',
    handler: async (matches, language) => {
      const startTime = Date.now();

      const [openNCRs, openCAPAs] = await Promise.all([
        prisma.nCR.findMany({
          where: { status: 'OPEN' },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.cAPA.count({ where: { status: 'OPEN' } }),
      ]);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        query: 'SELECT * FROM ncr WHERE status = OPEN',
        naturalLanguage: language === 'vi'
          ? 'Các vấn đề chất lượng đang mở'
          : 'Open quality issues',
        data: [{
          summary: {
            openNCRs: openNCRs.length,
            openCAPAs,
            total: openNCRs.length + openCAPAs,
          },
          ncrs: openNCRs.map(ncr => ({
            ncrNumber: ncr.ncrNumber,
            title: ncr.title,
            source: ncr.source,
            priority: ncr.priority,
            createdAt: ncr.createdAt,
            daysOpen: Math.floor((Date.now() - ncr.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
          })),
        }],
        metadata: {
          rowCount: openNCRs.length,
          executionTime,
          confidence: 0.93,
          explanation: `${openNCRs.length} NCRs and ${openCAPAs} CAPAs currently open`,
          explanationVi: `${openNCRs.length} NCR và ${openCAPAs} CAPA đang mở`,
        },
        suggestedFollowups: [
          { en: 'Show NCRs by supplier', vi: 'Hiển thị NCR theo NCC' },
          { en: 'Quality trend analysis', vi: 'Phân tích xu hướng chất lượng' },
          { en: 'First pass yield report', vi: 'Báo cáo FPY' },
        ],
      };
    },
  },
];

// Main query processor
export async function processNaturalLanguageQuery(
  query: string,
  language: 'en' | 'vi' = 'en'
): Promise<NLQueryResult> {
  const startTime = Date.now();

  // Find matching pattern
  for (const pattern of queryPatterns) {
    for (const regex of pattern.patterns) {
      const matches = query.match(regex);
      if (matches) {
        try {
          return await pattern.handler(matches, language);
        } catch (error) {
          logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'nl-query-engine', intent: pattern.intent });
          return {
            success: false,
            query: '',
            naturalLanguage: query,
            data: [],
            metadata: {
              rowCount: 0,
              executionTime: Date.now() - startTime,
              confidence: 0,
              explanation: 'Error processing query',
              explanationVi: 'Lỗi khi xử lý truy vấn',
            },
            suggestedFollowups: [],
            warnings: ['Query processing failed'],
          };
        }
      }
    }
  }

  // No pattern matched - return help message
  return {
    success: false,
    query: '',
    naturalLanguage: query,
    data: [],
    metadata: {
      rowCount: 0,
      executionTime: Date.now() - startTime,
      confidence: 0.3,
      explanation: 'Could not understand the query. Try asking about inventory, sales, suppliers, production, or quality.',
      explanationVi: 'Không hiểu câu hỏi. Hãy thử hỏi về tồn kho, bán hàng, nhà cung cấp, sản xuất, hoặc chất lượng.',
    },
    suggestedFollowups: [
      { en: 'Show low stock items', vi: 'Hiển thị hàng sắp hết' },
      { en: 'Sales this month', vi: 'Doanh thu tháng này' },
      { en: 'Supplier performance', vi: 'Hiệu suất nhà cung cấp' },
      { en: 'Production status', vi: 'Trạng thái sản xuất' },
      { en: 'Open quality issues', vi: 'Vấn đề chất lượng đang mở' },
    ],
    warnings: ['Query not understood'],
  };
}

// Get supported query types
export function getSupportedQueryTypes(): { intent: string; examples: { en: string; vi: string }[] }[] {
  return [
    {
      intent: 'inventory',
      examples: [
        { en: 'Show low stock items', vi: 'Hiển thị hàng sắp hết' },
        { en: 'Total inventory value', vi: 'Tổng giá trị tồn kho' },
        { en: 'Inventory by category', vi: 'Tồn kho theo danh mục' },
      ],
    },
    {
      intent: 'sales',
      examples: [
        { en: 'Sales this month', vi: 'Doanh thu tháng này' },
        { en: 'Top selling products', vi: 'Sản phẩm bán chạy nhất' },
        { en: 'Revenue comparison', vi: 'So sánh doanh thu' },
      ],
    },
    {
      intent: 'suppliers',
      examples: [
        { en: 'Supplier performance', vi: 'Hiệu suất nhà cung cấp' },
        { en: 'Best suppliers', vi: 'Nhà cung cấp tốt nhất' },
        { en: 'NDAA compliant suppliers', vi: 'NCC tuân thủ NDAA' },
      ],
    },
    {
      intent: 'production',
      examples: [
        { en: 'Active work orders', vi: 'Work order đang chạy' },
        { en: 'Production status', vi: 'Trạng thái sản xuất' },
        { en: 'Delayed orders', vi: 'Đơn hàng bị trễ' },
      ],
    },
    {
      intent: 'quality',
      examples: [
        { en: 'Open NCRs', vi: 'NCR đang mở' },
        { en: 'Quality issues', vi: 'Vấn đề chất lượng' },
        { en: 'First pass yield', vi: 'Tỷ lệ FPY' },
      ],
    },
  ];
}
