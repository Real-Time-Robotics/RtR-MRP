'use client';

/**
 * Client-side auth redirect component
 * Disabled: Allow users to access landing page even when logged in
 * This enables the back button to work properly from dashboard
 */
export function AuthRedirect() {
  // Disabled auto-redirect to allow logged-in users to view landing page
  // Previously redirected authenticated users to /home
  return null;
}
