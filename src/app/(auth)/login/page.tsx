// =============================================================================
// LOGIN PAGE — Redirect stub to RTR Auth Gateway
// =============================================================================

import { redirect } from 'next/navigation';

const AUTH_GATEWAY_URL = process.env.RTR_AUTH_GATEWAY_URL || 'https://auth.rtrobotics.com';
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export default function LoginPage() {
  redirect(`${AUTH_GATEWAY_URL}/login?redirect=${encodeURIComponent(APP_URL)}`);
}
