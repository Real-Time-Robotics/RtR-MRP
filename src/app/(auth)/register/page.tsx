// =============================================================================
// REGISTER PAGE — Redirect stub to RTR Auth Gateway
// =============================================================================

import { redirect } from 'next/navigation';

const AUTH_GATEWAY_URL = process.env.RTR_AUTH_GATEWAY_URL || 'https://auth.rtrobotics.com';

export default function RegisterPage() {
  redirect(`${AUTH_GATEWAY_URL}/register`);
}
