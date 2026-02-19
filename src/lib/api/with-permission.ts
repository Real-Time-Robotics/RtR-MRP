import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { Permission, rolePermissions, UserRole } from '@/lib/auth/auth-types';
import { logger } from '@/lib/logger';

// =============================================================================
// API PERMISSION MIDDLEWARE
// Higher-order function to protect API routes with permission checks
// =============================================================================

/**
 * User object from session
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isDemo?: boolean;
}

/**
 * Permission configuration for different HTTP methods
 */
export interface PermissionConfig {
  /** Permission required for GET requests */
  read?: Permission;
  /** Permission required for POST requests */
  create?: Permission;
  /** Permission required for PUT/PATCH requests */
  update?: Permission;
  /** Permission required for DELETE requests */
  delete?: Permission;
}

/**
 * Context passed to the handler
 */
export interface HandlerContext {
  params?: Record<string, string>;
  user: AuthUser;
}

/**
 * API handler function type
 */
export type ApiHandler = (
  request: NextRequest,
  context: HandlerContext
) => Promise<Response>;

/**
 * HTTP method to permission action mapping
 */
const METHOD_TO_ACTION: Record<string, keyof PermissionConfig> = {
  GET: 'read',
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

/**
 * Check if user has the required permission
 */
function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = rolePermissions[role];
  return permissions ? permissions.includes(permission) : false;
}

/**
 * Check if user email indicates demo account
 */
function isDemoUser(email: string): boolean {
  return email.includes('@demo.rtr-mrp.com') || email.includes('@demo.');
}

/**
 * Create a permission-protected API handler
 *
 * @example
 * // In your API route file
 * const handler = withPermission(
 *   async (req, { user, params }) => {
 *     // Your handler code here
 *     return NextResponse.json({ data: 'success' });
 *   },
 *   {
 *     read: 'orders:view',
 *     create: 'orders:create',
 *     update: 'orders:edit',
 *     delete: 'orders:delete',
 *   }
 * );
 *
 * export const GET = handler;
 * export const POST = handler;
 * export const PUT = handler;
 * export const DELETE = handler;
 */
export function withPermission(
  handler: ApiHandler,
  permissions: PermissionConfig
) {
  return async (
    request: NextRequest,
    context?: { params?: Record<string, string> }
  ): Promise<Response> => {
    try {
      // 1. Check authentication
      const session = await auth();

      if (!session?.user) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized',
            message: 'Bạn cần đăng nhập để thực hiện hành động này',
          },
          { status: 401 }
        );
      }

      // 2. Extract user info
      const sessionUser = session.user as {
        id?: string;
        email?: string | null;
        name?: string | null;
        role?: string;
      };

      const user: AuthUser = {
        id: sessionUser.id || '',
        email: sessionUser.email || '',
        name: sessionUser.name || '',
        role: (sessionUser.role as UserRole) || 'viewer',
        isDemo: isDemoUser(sessionUser.email || ''),
      };

      // 3. Determine required permission based on HTTP method
      const method = request.method || 'GET';
      const action = METHOD_TO_ACTION[method];
      const requiredPermission = action ? permissions[action] : undefined;

      // 4. Check permission if required
      if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden',
            message: `Bạn không có quyền ${getActionLabel(action)}. Yêu cầu quyền: ${requiredPermission}`,
            requiredPermission,
            userRole: user.role,
          },
          { status: 403 }
        );
      }

      // 5. Call the handler with user context
      return handler(request, {
        params: context?.params,
        user,
      });
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'api-permission-middleware' });
      return NextResponse.json(
        {
          success: false,
          error: 'Internal Server Error',
          message: 'Đã xảy ra lỗi khi xử lý yêu cầu',
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Get Vietnamese label for action
 */
function getActionLabel(action: keyof PermissionConfig): string {
  const labels: Record<keyof PermissionConfig, string> = {
    read: 'xem',
    create: 'tạo mới',
    update: 'chỉnh sửa',
    delete: 'xóa',
  };
  return labels[action] || action;
}

// =============================================================================
// CONVENIENCE WRAPPERS
// =============================================================================

/**
 * Create a read-only handler (GET only)
 */
export function withReadPermission(handler: ApiHandler, permission: Permission) {
  return withPermission(handler, { read: permission });
}

/**
 * Create a full CRUD handler
 */
export function withCrudPermissions(
  handler: ApiHandler,
  basePermission: string
) {
  return withPermission(handler, {
    read: `${basePermission}:view` as Permission,
    create: `${basePermission}:create` as Permission,
    update: `${basePermission}:edit` as Permission,
    delete: `${basePermission}:delete` as Permission,
  });
}

/**
 * Create handler requiring admin role only
 */
export function withAdminOnly(handler: ApiHandler) {
  return async (
    request: NextRequest,
    context?: { params?: Record<string, string> }
  ): Promise<Response> => {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const role = (session.user as { role?: string }).role;

    if (role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'Chỉ Admin mới có quyền thực hiện hành động này',
        },
        { status: 403 }
      );
    }

    const user: AuthUser = {
      id: (session.user as { id?: string }).id || '',
      email: session.user.email || '',
      name: session.user.name || '',
      role: 'admin',
      isDemo: isDemoUser(session.user.email || ''),
    };

    return handler(request, { params: context?.params, user });
  };
}

/**
 * Create handler requiring manager or admin role
 */
export function withManagerOrAdmin(handler: ApiHandler) {
  return async (
    request: NextRequest,
    context?: { params?: Record<string, string> }
  ): Promise<Response> => {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const role = (session.user as { role?: string }).role as UserRole;

    if (!['admin', 'manager'].includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'Cần quyền Manager hoặc Admin để thực hiện hành động này',
        },
        { status: 403 }
      );
    }

    const user: AuthUser = {
      id: (session.user as { id?: string }).id || '',
      email: session.user.email || '',
      name: session.user.name || '',
      role,
      isDemo: isDemoUser(session.user.email || ''),
    };

    return handler(request, { params: context?.params, user });
  };
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

/**
 * Standard success response
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Standard error response
 */
export function errorResponse(
  message: string,
  status = 400,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    { success: false, error: message, message, ...details },
    { status }
  );
}

/**
 * Not found response
 */
export function notFoundResponse(entity = 'Resource') {
  return NextResponse.json(
    { success: false, error: 'Not Found', message: `${entity} không tồn tại` },
    { status: 404 }
  );
}

/**
 * Validation error response
 */
export function validationErrorResponse(errors: Record<string, string[]>) {
  return NextResponse.json(
    { success: false, error: 'Validation Error', errors },
    { status: 422 }
  );
}

export default withPermission;
