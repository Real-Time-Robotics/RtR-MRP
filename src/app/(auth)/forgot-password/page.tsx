// =============================================================================
// FORGOT PASSWORD — Redirect stub to RTR Auth Gateway
// =============================================================================

import { redirect } from 'next/navigation';

const AUTH_GATEWAY_URL = process.env.RTR_AUTH_GATEWAY_URL || 'https://auth.rtrobotics.com';

export default function ForgotPasswordPage() {
  redirect(`${AUTH_GATEWAY_URL}/forgot-password`);
}
