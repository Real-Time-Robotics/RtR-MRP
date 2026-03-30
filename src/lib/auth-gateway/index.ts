// =============================================================================
// RTR AUTH GATEWAY — Public API
// =============================================================================

export type { RtrJwtPayload, RtrUser, RtrSession } from './types';
export { RTR_AUTH_CONFIG } from './types';
export { verifyRtrToken, getRtrSession, verifyFromRequest, getUserFromRequest } from './verify';
export { mapToMrpRole, getMrpPermissions, hasGatewayPermission } from './permissions';
