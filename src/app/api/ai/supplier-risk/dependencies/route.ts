// =============================================================================
// AI SUPPLIER RISK - DEPENDENCIES API ROUTE
// GET /api/ai/supplier-risk/dependencies - Get dependency analysis
// POST /api/ai/supplier-risk/dependencies - Analyze specific dependencies
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import { getDependencyAnalyzer } from '@/lib/ai/supplier-risk';
import { z } from 'zod';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
// =============================================================================
// GET - Dependency Analysis
// =============================================================================

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
const searchParams = request.nextUrl.searchParams;
    const months = parseInt(searchParams.get('months') || '12');
    const view = searchParams.get('view') || 'summary';

    const dependencyAnalyzer = getDependencyAnalyzer();
    const analysis = await dependencyAnalyzer.analyzeDependencies(months);

    switch (view) {
      case 'summary': {
        return NextResponse.json({
          success: true,
          data: {
            summary: analysis.summary,
            concentrationRisk: {
              overallScore: analysis.concentrationRisk.overallScore,
              riskLevel: analysis.concentrationRisk.riskLevel,
              spendConcentration: analysis.concentrationRisk.spendConcentration,
              volumeConcentration: analysis.concentrationRisk.volumeConcentration,
            },
            geographicRisk: {
              overallScore: analysis.geographicRisk.overallScore,
              riskLevel: analysis.geographicRisk.riskLevel,
              diversificationScore: analysis.geographicRisk.diversificationScore,
              topCountries: analysis.geographicRisk.countryConcentration.slice(0, 5),
            },
            recommendations: analysis.recommendations.slice(0, 5),
          },
          generatedAt: new Date().toISOString(),
        });
      }

      case 'single_source': {
        return NextResponse.json({
          success: true,
          data: {
            singleSourceParts: analysis.singleSourceParts.map((p) => ({
              partId: p.partId,
              partSku: p.partSku,
              partName: p.partName,
              category: p.category,
              isCritical: p.isCritical,
              supplierId: p.supplierId,
              supplierName: p.supplierName,
              supplierCountry: p.supplierCountry,
              supplierRating: p.supplierRating,
              monthlySpend: p.monthlySpend,
              leadTimeDays: p.leadTimeDays,
              riskScore: p.riskScore,
              alternativeSupplierCount: p.alternativeSuppliers.length,
            })),
            count: analysis.singleSourceParts.length,
            criticalCount: analysis.singleSourceParts.filter((p) => p.isCritical).length,
            totalMonthlySpend: analysis.singleSourceParts.reduce((sum, p) => sum + p.monthlySpend, 0),
          },
          generatedAt: new Date().toISOString(),
        });
      }

      case 'concentration': {
        return NextResponse.json({
          success: true,
          data: {
            concentrationRisk: analysis.concentrationRisk,
            topSuppliers: analysis.concentrationRisk.topSuppliers.map((s) => ({
              supplierId: s.supplierId,
              supplierName: s.supplierName,
              country: s.country,
              spendPercent: s.spendPercent,
              volumePercent: s.volumePercent,
              partCount: s.partCount,
              criticalPartCount: s.criticalPartCount,
              riskScore: s.riskScore,
              rating: s.rating,
            })),
          },
          generatedAt: new Date().toISOString(),
        });
      }

      case 'geographic': {
        return NextResponse.json({
          success: true,
          data: {
            geographicRisk: analysis.geographicRisk,
            countryConcentration: analysis.geographicRisk.countryConcentration.map((c) => ({
              country: c.country,
              supplierCount: c.supplierCount,
              spendPercent: c.spendPercent,
              partCount: c.partCount,
              criticalPartCount: c.criticalPartCount,
              riskFactors: c.riskFactors,
            })),
            regionConcentration: analysis.geographicRisk.regionConcentration,
          },
          generatedAt: new Date().toISOString(),
        });
      }

      case 'critical': {
        return NextResponse.json({
          success: true,
          data: {
            criticalDependencies: analysis.criticalDependencies.map((d) => ({
              partId: d.partId,
              partSku: d.partSku,
              partName: d.partName,
              isCritical: d.isCritical,
              category: d.category,
              dependencyType: d.dependencyType,
              riskScore: d.riskScore,
              riskLevel: d.riskLevel,
              primarySupplier: d.primarySupplier,
              impactDescription: d.impactDescription,
              mitigationOptions: d.mitigationOptions,
            })),
            count: analysis.criticalDependencies.length,
            byType: {
              single_source: analysis.criticalDependencies.filter((d) => d.dependencyType === 'single_source').length,
              geographic: analysis.criticalDependencies.filter((d) => d.dependencyType === 'geographic').length,
              supplier_risk: analysis.criticalDependencies.filter((d) => d.dependencyType === 'supplier_risk').length,
              volume: analysis.criticalDependencies.filter((d) => d.dependencyType === 'volume').length,
            },
          },
          generatedAt: new Date().toISOString(),
        });
      }

      case 'full': {
        return NextResponse.json({
          success: true,
          data: analysis,
          generatedAt: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid view. Use: summary, single_source, concentration, geographic, critical, full',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/supplier-risk/dependencies' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dependency analysis',
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// POST - Analyze Specific Dependencies
// =============================================================================

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
const bodySchema = z.object({
      action: z.enum(['part_dependency', 'supplier_dependency']),
      partId: z.string().optional(),
      supplierId: z.string().optional(),
    });
    const rawBody = await request.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parseResult.data;
    const { action, partId, supplierId } = body;

    const dependencyAnalyzer = getDependencyAnalyzer();

    switch (action) {
      case 'part_dependency': {
        if (!partId) {
          return NextResponse.json(
            { success: false, error: 'partId is required' },
            { status: 400 }
          );
        }

        const partDependency = await dependencyAnalyzer.analyzePartDependency(partId);

        if (!partDependency) {
          return NextResponse.json(
            { success: false, error: 'Part not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            part: partDependency.part,
            supplierCount: partDependency.supplierCount,
            suppliers: partDependency.suppliers,
            isSingleSource: partDependency.isSingleSource,
            riskScore: partDependency.riskScore,
            riskLevel: partDependency.riskLevel,
            recommendations: partDependency.recommendations,
          },
          generatedAt: new Date().toISOString(),
        });
      }

      case 'supplier_dependency': {
        if (!supplierId) {
          return NextResponse.json(
            { success: false, error: 'supplierId is required' },
            { status: 400 }
          );
        }

        const supplierDependency = await dependencyAnalyzer.getSupplierDependencyBreakdown(supplierId);

        if (!supplierDependency) {
          return NextResponse.json(
            { success: false, error: 'Supplier not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            supplier: supplierDependency.supplier,
            dependentParts: supplierDependency.dependentParts,
            totalPartsSupplied: supplierDependency.totalPartsSupplied,
            criticalPartsSupplied: supplierDependency.criticalPartsSupplied,
            soleSourceParts: supplierDependency.soleSourceParts,
            totalMonthlySpend: supplierDependency.totalMonthlySpend,
            dependencyScore: supplierDependency.dependencyScore,
            riskIfRemoved: supplierDependency.riskIfRemoved,
          },
          generatedAt: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: part_dependency, supplier_dependency' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/supplier-risk/dependencies' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze dependencies',
      },
      { status: 500 }
    );
  }
});
