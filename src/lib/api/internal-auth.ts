import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

const ALLOWED_SOURCES = ['prismy-crm', 'prismy-otb', 'prismy-tpm', 'prismy-shell']

export function validateInternalRequest(req: NextRequest): NextResponse | null {
  const source = req.headers.get('x-prismy-source')
  if (!source || !ALLOWED_SOURCES.includes(source)) {
    return NextResponse.json(
      { error: 'Unauthorized: missing or invalid x-prismy-source header' },
      { status: 401 }
    )
  }

  // Validate shared secret
  const secret = req.headers.get('x-prismy-secret')
  const expectedSecret = process.env.INTERNAL_API_SECRET
  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'Internal API not configured' },
      { status: 500 }
    )
  }

  if (!secret || !safeCompare(secret, expectedSecret)) {
    return NextResponse.json(
      { error: 'Unauthorized: invalid secret' },
      { status: 401 }
    )
  }

  return null
}

function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) return false
    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}
