export type UserRole = 'admin' | 'manager' | 'supervisor' | 'planner' | 'quality' | 'operator' | 'viewer' | 'user';

export const ROLES: Record<string, UserRole> = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    SUPERVISOR: 'supervisor',
    PLANNER: 'planner',
    QUALITY: 'quality',
    OPERATOR: 'operator',
    VIEWER: 'viewer',
    USER: 'user',
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
    admin: 100,
    manager: 80,
    supervisor: 60,
    planner: 50,
    quality: 45,
    operator: 40,
    viewer: 20,
    user: 10,
};

export function hasPermission(userRole: string, requiredRole: UserRole): boolean {
    const userLevel = ROLE_HIERARCHY[userRole as UserRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 100;
    return userLevel >= requiredLevel;
}

export function hasAnyRole(userRole: string, allowedRoles: UserRole[]): boolean {
    return allowedRoles.some(role => hasPermission(userRole, role));
}
