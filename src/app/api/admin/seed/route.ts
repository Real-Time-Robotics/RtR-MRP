
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateSuppliers, generateParts, generateCustomers } from '@/lib/stress-test-data';

export const dynamic = 'force-dynamic'; // Prevent caching

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        // Simple auth check - in production checking for ADMIN role is better
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { type, count } = await request.json();
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
        console.error('Seeding error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Seeding failed' },
            { status: 500 }
        );
    }
}
