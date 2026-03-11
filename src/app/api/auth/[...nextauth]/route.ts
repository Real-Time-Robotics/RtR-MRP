import { handlers } from "@/lib/auth";
import { NextRequest } from "next/server";
import { checkSigninLimit } from "@/lib/rate-limit";

const { GET, POST: originalPOST } = handlers;

// Wrap POST with rate limiting for signin/callback (5 req/min per IP)
async function POST(request: NextRequest) {
  // Check if this is a signin/callback request from the URL path
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname.includes('callback') || pathname.includes('signin')) {
    const rateLimitResult = await checkSigninLimit(request);
    if (rateLimitResult) return rateLimitResult;
  }

  return originalPOST(request);
}

export { GET, POST };
