/**
 * AI Error Explainer
 *
 * Provides AI-powered explanations for error messages to help users understand
 * what went wrong and how to fix it.
 */

// Common error patterns and their explanations (cached for performance)
const ERROR_EXPLANATIONS: Record<string, { explanation: string; suggestion: string }> = {
  // Validation errors
  'required': {
    explanation: 'Trường này là bắt buộc và không được để trống.',
    suggestion: 'Vui lòng điền thông tin vào trường này trước khi lưu.',
  },
  'email': {
    explanation: 'Định dạng email không hợp lệ.',
    suggestion: 'Email phải có dạng: ten@domain.com',
  },
  'min': {
    explanation: 'Giá trị nhập vào nhỏ hơn giới hạn cho phép.',
    suggestion: 'Vui lòng nhập giá trị lớn hơn hoặc bằng giá trị tối thiểu.',
  },
  'max': {
    explanation: 'Giá trị nhập vào lớn hơn giới hạn cho phép.',
    suggestion: 'Vui lòng nhập giá trị nhỏ hơn hoặc bằng giá trị tối đa.',
  },

  // Business rule violations
  'moq': {
    explanation: 'Số lượng đặt hàng thấp hơn MOQ (Minimum Order Quantity) của nhà cung cấp.',
    suggestion: 'Tăng số lượng đặt hàng lên ít nhất bằng MOQ, hoặc chọn nhà cung cấp khác có MOQ thấp hơn.',
  },
  'credit_limit': {
    explanation: 'Đơn hàng vượt quá hạn mức tín dụng của khách hàng.',
    suggestion: 'Giảm giá trị đơn hàng hoặc liên hệ bộ phận tài chính để tăng hạn mức.',
  },
  'stock': {
    explanation: 'Số lượng tồn kho không đủ để thực hiện đơn hàng.',
    suggestion: 'Kiểm tra tồn kho thực tế hoặc điều chỉnh số lượng đặt hàng.',
  },
  'lead_time': {
    explanation: 'Thời gian giao hàng yêu cầu ngắn hơn lead time của nhà cung cấp.',
    suggestion: 'Điều chỉnh ngày yêu cầu giao hàng hoặc chọn nhà cung cấp có lead time ngắn hơn.',
  },

  // Duplicate errors
  'already_exists': {
    explanation: 'Mã hoặc tên đã tồn tại trong hệ thống.',
    suggestion: 'Sử dụng mã/tên khác hoặc chỉnh sửa bản ghi hiện có.',
  },
  'duplicate': {
    explanation: 'Bản ghi này đã tồn tại trong hệ thống.',
    suggestion: 'Kiểm tra lại dữ liệu hoặc tìm kiếm bản ghi hiện có để cập nhật.',
  },

  // Permission errors
  'unauthorized': {
    explanation: 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.',
    suggestion: 'Vui lòng đăng nhập lại để tiếp tục.',
  },
  'forbidden': {
    explanation: 'Bạn không có quyền thực hiện hành động này.',
    suggestion: 'Liên hệ quản trị viên để được cấp quyền phù hợp.',
  },

  // System errors
  'network': {
    explanation: 'Không thể kết nối đến máy chủ.',
    suggestion: 'Kiểm tra kết nối mạng và thử lại sau.',
  },
  'server': {
    explanation: 'Đã xảy ra lỗi trên máy chủ.',
    suggestion: 'Vui lòng thử lại sau hoặc liên hệ hỗ trợ kỹ thuật nếu lỗi tiếp tục xảy ra.',
  },
  'timeout': {
    explanation: 'Yêu cầu mất quá nhiều thời gian để xử lý.',
    suggestion: 'Thử lại hoặc chia nhỏ thao tác nếu đang xử lý nhiều dữ liệu.',
  },
};

// Vietnamese keyword mappings for error detection
const ERROR_KEYWORDS: Record<string, string[]> = {
  'required': ['bắt buộc', 'required', 'không được để trống', 'cần thiết'],
  'email': ['email', 'không hợp lệ', 'invalid email'],
  'min': ['tối thiểu', 'minimum', 'nhỏ hơn', 'less than', '>=', '>'],
  'max': ['tối đa', 'maximum', 'lớn hơn', 'greater than', '<=', '<'],
  'moq': ['moq', 'minimum order', 'số lượng đặt tối thiểu'],
  'credit_limit': ['credit', 'hạn mức', 'tín dụng', 'vượt quá'],
  'stock': ['tồn kho', 'stock', 'không đủ', 'insufficient'],
  'lead_time': ['lead time', 'thời gian giao', 'ngày giao'],
  'already_exists': ['đã tồn tại', 'already exists', 'duplicate', 'trùng'],
  'duplicate': ['trùng', 'duplicate', 'đã có'],
  'unauthorized': ['unauthorized', 'chưa đăng nhập', 'session expired'],
  'forbidden': ['forbidden', 'không có quyền', 'permission denied'],
  'network': ['network', 'connection', 'kết nối'],
  'server': ['server error', 'internal error', 'lỗi máy chủ', '500'],
  'timeout': ['timeout', 'quá thời gian', 'timed out'],
};

export interface ErrorExplanation {
  errorMessage: string;
  explanation: string;
  suggestion: string;
  errorType: string;
}

/**
 * Detect the type of error from the error message
 */
function detectErrorType(errorMessage: string): string {
  const lowerMessage = errorMessage.toLowerCase();

  for (const [errorType, keywords] of Object.entries(ERROR_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        return errorType;
      }
    }
  }

  return 'unknown';
}

/**
 * Get AI explanation for an error message
 * Uses cached explanations for common errors, can be extended with actual AI calls
 */
export function explainError(errorMessage: string, context?: {
  field?: string;
  entity?: string;
  value?: unknown;
}): ErrorExplanation {
  const errorType = detectErrorType(errorMessage);
  const cached = ERROR_EXPLANATIONS[errorType];

  if (cached) {
    // Customize explanation with context if available
    let explanation = cached.explanation;
    let suggestion = cached.suggestion;

    if (context?.field) {
      explanation = explanation.replace('Trường này', `Trường "${context.field}"`);
    }

    if (context?.entity) {
      suggestion = suggestion.replace('bản ghi', context.entity);
    }

    return {
      errorMessage,
      explanation,
      suggestion,
      errorType,
    };
  }

  // Default for unknown errors
  return {
    errorMessage,
    explanation: 'Đã xảy ra lỗi không xác định.',
    suggestion: 'Vui lòng kiểm tra lại dữ liệu nhập vào hoặc liên hệ hỗ trợ kỹ thuật.',
    errorType: 'unknown',
  };
}

/**
 * Get batch explanations for multiple errors
 */
export function explainErrors(errors: Array<{ message: string; field?: string }>): ErrorExplanation[] {
  return errors.map(error => explainError(error.message, { field: error.field }));
}

/**
 * Format error explanation for display
 */
export function formatErrorExplanation(explanation: ErrorExplanation): string {
  return `${explanation.explanation}\n\nGợi ý: ${explanation.suggestion}`;
}
