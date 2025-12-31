import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// =============================================================================
// RTR AI COPILOT - CHAT API ROUTE
// Handles AI chat requests with context-aware responses
// =============================================================================

// Types
interface ChatRequest {
  query: string;
  context: {
    page: string;
    module: string;
    userId: string;
    userName: string;
    userRole: string;
    selectedItems?: any[];
    filters?: Record<string, any>;
    language: 'en' | 'vi';
  };
  history: {
    role: 'user' | 'assistant';
    content: string;
  }[];
}

interface AIAction {
  id: string;
  type: 'create' | 'update' | 'delete' | 'navigate' | 'export' | 'notify';
  label: string;
  labelVi: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  payload?: any;
  endpoint?: string;
}

// Safety configuration
const SAFETY_CONFIG = {
  blockedPatterns: [
    /ignore previous instructions/i,
    /disregard all prior/i,
    /you are now/i,
    /pretend to be/i,
    /bypass/i,
    /override safety/i,
    /delete all/i,
    /drop table/i,
  ],
  maxQueryLength: 2000,
  rateLimitPerMinute: 30,
};

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Check rate limit
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || userLimit.resetAt < now) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }
  
  if (userLimit.count >= SAFETY_CONFIG.rateLimitPerMinute) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

// Check for prompt injection
function checkSafety(query: string): { safe: boolean; reason?: string } {
  // Check length
  if (query.length > SAFETY_CONFIG.maxQueryLength) {
    return { safe: false, reason: 'Query too long' };
  }
  
  // Check blocked patterns
  for (const pattern of SAFETY_CONFIG.blockedPatterns) {
    if (pattern.test(query)) {
      return { safe: false, reason: 'Blocked pattern detected' };
    }
  }
  
  return { safe: true };
}

// Detect user intent
function detectIntent(query: string): string {
  const intents = [
    { pattern: /bao nhiêu|how many|số lượng|count|tổng/i, intent: 'count_query' },
    { pattern: /hết hàng|out of stock|low stock|sắp hết|thiếu/i, intent: 'stock_alert' },
    { pattern: /doanh thu|revenue|sales|doanh số/i, intent: 'revenue_query' },
    { pattern: /so sánh|compare|vs|versus/i, intent: 'comparison' },
    { pattern: /dự báo|forecast|predict|dự đoán/i, intent: 'forecast' },
    { pattern: /tạo|create|thêm|add|mới/i, intent: 'create_action' },
    { pattern: /cập nhật|update|sửa|edit|chỉnh/i, intent: 'update_action' },
    { pattern: /xóa|delete|remove|hủy/i, intent: 'delete_action' },
    { pattern: /báo cáo|report|xuất|export/i, intent: 'report_query' },
    { pattern: /tại sao|why|nguyên nhân|reason|lý do/i, intent: 'analysis_query' },
    { pattern: /top|best|worst|nhất/i, intent: 'ranking_query' },
    { pattern: /status|trạng thái|tình trạng/i, intent: 'status_query' },
    { pattern: /supplier|ncc|nhà cung cấp|vendor/i, intent: 'supplier_query' },
    { pattern: /quality|chất lượng|ncr|capa/i, intent: 'quality_query' },
    { pattern: /production|sản xuất|work order|wo/i, intent: 'production_query' },
  ];
  
  for (const { pattern, intent } of intents) {
    if (pattern.test(query)) {
      return intent;
    }
  }
  
  return 'general_query';
}

// Fetch relevant data based on intent and context
async function fetchContextData(intent: string, context: ChatRequest['context']) {
  const data: Record<string, any> = {};
  
  try {
    switch (intent) {
      case 'stock_alert':
      case 'count_query':
        // Get inventory summary
        const inventoryStats = await prisma.inventory.aggregate({
          _sum: { quantity: true },
          _count: true,
        });
        
        const lowStockItems = await prisma.inventory.findMany({
          where: {
            quantity: { lte: 20 } // Below safety threshold
          },
          include: { part: true },
          take: 10,
        });
        
        data.inventoryStats = inventoryStats;
        data.lowStockItems = lowStockItems;
        break;
        
      case 'revenue_query':
        // Get sales summary
        const salesStats = await prisma.salesOrder.aggregate({
          _sum: { totalAmount: true },
          _count: true,
          where: {
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        });
        
        data.salesStats = salesStats;
        break;
        
      case 'supplier_query':
        // Get supplier info
        const suppliers = await prisma.supplier.findMany({
          take: 10,
          orderBy: { rating: 'desc' },
        });
        
        data.suppliers = suppliers;
        break;
        
      case 'production_query':
        // Get work order status
        const workOrders = await prisma.workOrder.findMany({
          where: { status: { in: ['RELEASED', 'IN_PROGRESS'] } },
          include: { product: true },
          take: 10,
        });
        
        data.workOrders = workOrders;
        break;
        
      case 'quality_query':
        // Get quality metrics
        const openNCRs = await prisma.nCR.count({ where: { status: 'OPEN' } });
        const openCAPAs = await prisma.cAPA.count({ where: { status: 'OPEN' } });
        
        data.qualityMetrics = { openNCRs, openCAPAs };
        break;
    }
  } catch (error) {
    console.error('Error fetching context data:', error);
  }
  
  return data;
}

// Generate AI response (simplified - in production use Claude API)
function generateResponse(
  query: string,
  intent: string,
  context: ChatRequest['context'],
  contextData: Record<string, any>
): {
  message: string;
  confidence: number;
  suggestedActions: AIAction[];
  dataUsed: string[];
  warnings?: string[];
} {
  const isVietnamese = context.language === 'vi';
  let message = '';
  let confidence = 0.75;
  const suggestedActions: AIAction[] = [];
  const dataUsed: string[] = [];
  const warnings: string[] = [];
  
  switch (intent) {
    case 'stock_alert':
      const lowItems = contextData.lowStockItems || [];
      dataUsed.push('Inventory');
      
      if (lowItems.length > 0) {
        confidence = 0.92;
        message = isVietnamese
          ? `📊 Phát hiện **${lowItems.length} linh kiện** có tồn kho thấp:\n\n`
          : `📊 Found **${lowItems.length} parts** with low stock:\n\n`;
        
        lowItems.slice(0, 5).forEach((item: any, index: number) => {
          message += `${index + 1}. **${item.part?.name || item.partId}**\n`;
          message += isVietnamese
            ? `   • Tồn kho: ${item.quantity} | Tối thiểu: ${item.part?.minStock || 'N/A'}\n`
            : `   • Stock: ${item.quantity} | Min: ${item.part?.minStock || 'N/A'}\n`;
        });
        
        if (lowItems.length > 5) {
          message += isVietnamese
            ? `\n...và ${lowItems.length - 5} linh kiện khác\n`
            : `\n...and ${lowItems.length - 5} more items\n`;
        }
        
        message += isVietnamese
          ? `\n💡 **Khuyến nghị:** Nên tạo PO bổ sung ngay để tránh gián đoạn sản xuất.`
          : `\n💡 **Recommendation:** Consider creating POs to avoid production delays.`;
        
        suggestedActions.push({
          id: 'create_po_bulk',
          type: 'create',
          label: 'Create PO for Low Stock Items',
          labelVi: 'Tạo PO cho linh kiện sắp hết',
          description: 'Create purchase orders for items below minimum stock',
          riskLevel: 'medium',
          requiresApproval: true,
          endpoint: '/api/purchase-orders/bulk-create',
        });
        
        suggestedActions.push({
          id: 'view_low_stock_report',
          type: 'navigate',
          label: 'View Low Stock Report',
          labelVi: 'Xem báo cáo tồn kho thấp',
          description: 'Navigate to detailed low stock report',
          riskLevel: 'low',
          requiresApproval: false,
          payload: { url: '/inventory?filter=low_stock' },
        });
      } else {
        confidence = 0.88;
        message = isVietnamese
          ? '✅ Tất cả linh kiện đều có đủ tồn kho. Không có cảnh báo nào.'
          : '✅ All parts have sufficient stock. No alerts at this time.';
      }
      break;
      
    case 'revenue_query':
      const salesStats = contextData.salesStats;
      dataUsed.push('Sales Orders');
      
      if (salesStats) {
        confidence = 0.90;
        const revenue = Number(salesStats._sum?.totalAmount || 0);
        const orderCount = salesStats._count || 0;
        
        message = isVietnamese
          ? `📈 **Tổng hợp doanh thu 30 ngày:**\n\n`
          : `📈 **Revenue Summary (Last 30 Days):**\n\n`;
        
        message += isVietnamese
          ? `• Tổng doanh thu: **$${revenue.toLocaleString()}**\n`
          : `• Total Revenue: **$${revenue.toLocaleString()}**\n`;
        message += isVietnamese
          ? `• Số đơn hàng: **${orderCount}**\n`
          : `• Orders: **${orderCount}**\n`;
        message += isVietnamese
          ? `• Giá trị trung bình/đơn: **$${orderCount > 0 ? Math.round(revenue / orderCount).toLocaleString() : 0}**`
          : `• Average Order Value: **$${orderCount > 0 ? Math.round(revenue / orderCount).toLocaleString() : 0}**`;
        
        suggestedActions.push({
          id: 'export_sales_report',
          type: 'export',
          label: 'Export Sales Report',
          labelVi: 'Xuất báo cáo bán hàng',
          description: 'Download detailed sales report',
          riskLevel: 'low',
          requiresApproval: false,
        });
      } else {
        confidence = 0.6;
        message = isVietnamese
          ? 'Không thể tải dữ liệu doanh thu. Vui lòng thử lại.'
          : 'Unable to load revenue data. Please try again.';
        warnings.push('Data fetch incomplete');
      }
      break;
      
    case 'production_query':
      const workOrders = contextData.workOrders || [];
      dataUsed.push('Work Orders');
      
      confidence = 0.88;
      message = isVietnamese
        ? `🏭 **Work Orders đang chạy: ${workOrders.length}**\n\n`
        : `🏭 **Active Work Orders: ${workOrders.length}**\n\n`;
      
      if (workOrders.length > 0) {
        workOrders.slice(0, 5).forEach((wo: any, index: number) => {
          message += `${index + 1}. **${wo.woNumber}** - ${wo.product?.name || wo.productId}\n`;
          message += isVietnamese
            ? `   • Trạng thái: ${wo.status} | SL: ${wo.quantity}\n`
            : `   • Status: ${wo.status} | Qty: ${wo.quantity}\n`;
        });
        
        suggestedActions.push({
          id: 'view_production_board',
          type: 'navigate',
          label: 'View Production Board',
          labelVi: 'Xem bảng sản xuất',
          description: 'Go to production planning board',
          riskLevel: 'low',
          requiresApproval: false,
          payload: { url: '/production' },
        });
      } else {
        message += isVietnamese
          ? 'Không có Work Order nào đang chạy.'
          : 'No active work orders at this time.';
      }
      break;
      
    case 'quality_query':
      const qm = contextData.qualityMetrics || {};
      dataUsed.push('Quality Management');
      
      confidence = 0.85;
      message = isVietnamese
        ? `🏆 **Tình trạng chất lượng:**\n\n`
        : `🏆 **Quality Status:**\n\n`;
      
      message += isVietnamese
        ? `• NCR đang mở: **${qm.openNCRs || 0}**\n`
        : `• Open NCRs: **${qm.openNCRs || 0}**\n`;
      message += isVietnamese
        ? `• CAPA đang mở: **${qm.openCAPAs || 0}**\n`
        : `• Open CAPAs: **${qm.openCAPAs || 0}**\n`;
      
      if ((qm.openNCRs || 0) > 5) {
        warnings.push(isVietnamese 
          ? 'Số NCR đang mở cao hơn bình thường'
          : 'Number of open NCRs is higher than normal');
      }
      
      suggestedActions.push({
        id: 'view_quality_dashboard',
        type: 'navigate',
        label: 'View Quality Dashboard',
        labelVi: 'Xem bảng chất lượng',
        description: 'Go to quality management dashboard',
        riskLevel: 'low',
        requiresApproval: false,
        payload: { url: '/quality' },
      });
      break;
      
    default:
      // General query response
      confidence = 0.7;
      message = isVietnamese
        ? `Tôi hiểu bạn đang hỏi về: "${query}"\n\nTôi có thể giúp bạn với:\n• Quản lý tồn kho và cảnh báo\n• Phân tích doanh thu\n• Theo dõi sản xuất\n• Quản lý chất lượng\n• Và nhiều hơn nữa!\n\nHãy hỏi cụ thể hơn để tôi có thể hỗ trợ tốt nhất.`
        : `I understand you're asking about: "${query}"\n\nI can help you with:\n• Inventory management and alerts\n• Revenue analysis\n• Production tracking\n• Quality management\n• And more!\n\nPlease ask a more specific question so I can assist you better.`;
      
      warnings.push(isVietnamese
        ? 'Câu hỏi chung - kết quả có thể không chính xác'
        : 'General query - results may not be accurate');
  }
  
  return {
    message,
    confidence,
    suggestedActions,
    dataUsed,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// Log audit entry
async function logAudit(
  userId: string,
  query: string,
  intent: string,
  response: any,
  latencyMs: number
) {
  try {
    // In production, save to database or logging service
    console.log('[AI Audit]', {
      timestamp: new Date().toISOString(),
      userId,
      query: query.substring(0, 100),
      intent,
      confidence: response.confidence,
      latencyMs,
    });
  } catch (error) {
    console.error('Audit logging error:', error);
  }
}

// Main handler
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: ChatRequest = await request.json();
    const { query, context, history } = body;
    
    // Validate request
    if (!query || !context) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Safety check
    const safetyCheck = checkSafety(query);
    if (!safetyCheck.safe) {
      return NextResponse.json({
        message: context.language === 'vi'
          ? 'Xin lỗi, tôi không thể xử lý yêu cầu này vì lý do an toàn.'
          : 'Sorry, I cannot process this request for safety reasons.',
        confidence: 0,
        suggestedActions: [],
        dataUsed: [],
        warnings: [safetyCheck.reason || 'Safety check failed'],
      });
    }
    
    // Rate limiting
    if (!checkRateLimit(context.userId)) {
      return NextResponse.json({
        message: context.language === 'vi'
          ? 'Bạn đang gửi quá nhiều tin nhắn. Vui lòng đợi một chút.'
          : 'You are sending too many messages. Please wait a moment.',
        confidence: 0,
        suggestedActions: [],
        dataUsed: [],
        warnings: ['Rate limit exceeded'],
      });
    }
    
    // Detect intent
    const intent = detectIntent(query);
    
    // Fetch relevant data
    const contextData = await fetchContextData(intent, context);
    
    // Generate response
    const response = generateResponse(query, intent, context, contextData);
    
    // Log audit
    const latencyMs = Date.now() - startTime;
    await logAudit(context.userId, query, intent, response, latencyMs);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('AI Chat API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Sorry, an error occurred. Please try again.',
        confidence: 0,
        suggestedActions: [],
        dataUsed: [],
      },
      { status: 500 }
    );
  }
}

// GET: Health check and capabilities info
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    version: '1.0.0',
    capabilities: [
      'inventory_management',
      'sales_analysis',
      'production_tracking',
      'quality_management',
      'procurement_assistance',
      'natural_language_query',
      'action_suggestions',
    ],
    safetyFeatures: [
      'prompt_injection_prevention',
      'rate_limiting',
      'confidence_scoring',
      'audit_logging',
      'human_approval_required',
    ],
  });
}
