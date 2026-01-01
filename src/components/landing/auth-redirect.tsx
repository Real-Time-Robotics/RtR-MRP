'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Client-side auth redirect component
 * Redirects logged-in users to /home without causing server-side errors
 */
export function AuthRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if user is authenticated and session is loaded
    if (status === 'authenticated' && session) {
      router.replace('/home');
    }
  }, [session, status, router]);

  // Render nothing - this is just for the redirect logic
  return null;
}
