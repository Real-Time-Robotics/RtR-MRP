import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_SOURCES = ['prismy-crm', 'prismy-otb', 'prismy-tpm', 'prismy-shell']

export function validateInternalRequest(req: NextRequest): NextResponse | null {
  const source = req.headers.get('x-prismy-source')
  if (!source || !ALLOWED_SOURCES.includes(source)) {
    return NextResponse.json(
      { error: 'Unauthorized: missing or invalid x-prismy-source header' },
      { status: 401 }
    )
  }
  return null
}
