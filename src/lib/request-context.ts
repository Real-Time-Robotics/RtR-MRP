// src/lib/request-context.ts
// Request context helpers for API logging
// Gate 5.3 requirement: extract requestId, IP, route from requests

export function getRequestId(req: Request): string {
    return req.headers.get('x-request-id') ?? 'unknown';
}

export function getClientIp(req: Request): string {
    const xff = req.headers.get('x-forwarded-for');
    if (!xff) return 'unknown';

    // Extract first IP from comma-separated list
    const firstIp = xff.split(',')[0]?.trim();
    return firstIp || 'unknown';
}

export function getRoute(req: Request): string {
    try {
        return new URL(req.url).pathname;
    } catch {
        return 'unknown';
    }
}
