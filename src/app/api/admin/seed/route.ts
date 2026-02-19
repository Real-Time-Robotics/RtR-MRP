
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoleAuth } from '@/lib/api/with-auth';
import { generateSuppliers, generateParts, generateCustomers } from '@/lib/stress-test-data';
import { logger } from '@/lib/logger';
import { checkWriteEndpointLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic'; // Prevent caching

export const POST = withRoleAuth(['admin'], async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

    try {
        const bodySchema = z.object({
            type: z.string(),
            count: z.number().optional(),
        });

        const rawBody = await request.json();
        const parseResult = bodySchema.safeParse(rawBody);
        if (!parseResult.success) {
            return NextResponse.json(
                { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
                { status: 400 }
            );
        }
        const { type, count } = parseResult.data;
        const qty = Number(count) || 50; // Default 50 items if not specified, safe default

        // Cap at 10000 to prevent timeout/abuse
        if (qty > 10000) {
            return NextResponse.json({ error: 'Limit 10000 items per request' }, { status: 400 });
        }

        const results: Record<string, number> = {};

        if (type === 'all' || type === 'suppliers') {
            results.suppliers = await generateSuppliers(qty);
        }

        if (type === 'all' || type === 'parts') {
            results.parts = await generateParts(qty);
        }

        if (type === 'all' || type === 'customers') {
            results.customers = await generateCustomers(qty);
        }

        return NextResponse.json({
            success: true,
            message: 'Seeding completed',
            results
        });

    } catch (error) {
        logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/admin/seed' });
        return NextResponse.json(
            { error: 'Failed to seed data' },
            { status: 500 }
        );
    }
});
