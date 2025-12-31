// =============================================================================
// RTR MRP - QUALITY/NCR API ROUTE (SECURED)
// /api/v2/quality/route.ts
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthUser } from '@/lib/auth/middleware';
import { sanitize, sanitizeObject } from '@/lib/security/sanitize';
import { handleError, successResponse } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// =============================================================================
// SCHEMAS
// =============================================================================

const qualityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: z.enum(['open', 'in_progress', 'pending_review', 'closed']).optional(),
  severity: z.enum(['minor', 'major', 'critical']).optional(),
  source: z.enum(['supplier', 'production', 'customer']).optional(),
  view: z.enum(['list', 'kanban']).default('list'),
});

const ncrCreateSchema = z.object({
  title: z.string().min(1).max(200),
  source: z.enum(['supplier', 'production', 'customer']).default('production'),
  partId: z.string().optional(),
  quantityAffected: z.number().positive().default(1),
  description: z.string().min(1).max(2000),
  defectCategory: z.string().max(100).optional(),
  preliminaryCause: z.string().max(2000).optional(),
  disposition: z.enum(['Scrap', 'Rework', 'Return', 'Use-as-is']).optional(),
  totalCost: z.number().min(0).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

// =============================================================================
// GET - List NCRs (requires quality:read permission)
// =============================================================================

export const GET = withAuth(
  async (request: NextRequest, { user }: { params: any; user: AuthUser }) => {
    const startTime = performance.now();

    try {
      const { searchParams } = new URL(request.url);

      // Validate query parameters
      const paramsObj: Record<string, string> = {};
      searchParams.forEach((value, key) => { paramsObj[key] = value; });

      const validation = qualityQuerySchema.safeParse(paramsObj);
      if (!validation.success) {
        return handleError(validation.error);
      }

      const params = validation.data;
      const sanitizedSearch = params.search ? sanitize(params.search) : undefined;

      logger.info('Fetching NCRs', {
        userId: user.id,
        filters: { ...params, search: sanitizedSearch }
      });

      // Build where clause
      const where: any = {};

      if (sanitizedSearch) {
        where.OR = [
          { ncrNumber: { contains: sanitizedSearch, mode: 'insensitive' } },
          { description: { contains: sanitizedSearch, mode: 'insensitive' } },
          { partNumber: { contains: sanitizedSearch, mode: 'insensitive' } },
        ];
      }

      if (params.status) {
        where.status = params.status;
      }

      if (params.source) {
        where.source = params.source;
      }

      // Get total count
      const total = await prisma.nCR.count({ where });

      // Get NCRs
      const ncrs = await prisma.nCR.findMany({
        where,
        skip: params.view === 'kanban' ? 0 : (params.page - 1) * params.pageSize,
        take: params.view === 'kanban' ? 100 : params.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          capa: {
            select: {
              id: true,
              capaNumber: true,
              type: true,
              status: true,
              targetDate: true,
            }
          },
          part: {
            select: {
              partNumber: true,
              name: true,
            }
          },
        },
      });

      // Format NCRs
      const formattedNCRs = ncrs.map(ncr => {
        let severity = 'minor';
        const totalCost = Number(ncr.totalCost || 0);
        if (totalCost > 5000 || ncr.source === 'CUSTOMER') {
          severity = 'critical';
        } else if (totalCost > 1000) {
          severity = 'major';
        }

        const dueDate = new Date(ncr.createdAt);
        dueDate.setDate(dueDate.getDate() + 7);

        return {
          id: ncr.id,
          ncrNumber: ncr.ncrNumber,
          partId: ncr.partId,
          partNumber: ncr.part?.partNumber || null,
          partName: ncr.part?.name || null,
          title: ncr.title,
          description: ncr.description,
          defectCategory: ncr.defectCategory,
          source: ncr.source,
          quantityAffected: Number(ncr.quantityAffected),
          preliminaryCause: ncr.preliminaryCause,
          disposition: ncr.disposition,
          totalCost,
          priority: ncr.priority,
          status: ncr.status,
          severity,
          createdBy: ncr.createdBy,
          dateCreated: ncr.createdAt,
          dueDate,
          isOverdue: ncr.status !== 'closed' && dueDate < new Date(),
          capa: ncr.capa,
          hasCAPA: !!ncr.capa,
          createdAt: ncr.createdAt,
          updatedAt: ncr.updatedAt,
        };
      });

      // Filter by severity if specified
      let filteredNCRs = formattedNCRs;
      if (params.severity) {
        filteredNCRs = formattedNCRs.filter(n => n.severity === params.severity);
      }

      // Group by status for Kanban view
      let kanbanData = null;
      if (params.view === 'kanban') {
        kanbanData = {
          open: filteredNCRs.filter(n => n.status === 'open'),
          in_progress: filteredNCRs.filter(n => n.status === 'in_progress'),
          pending_review: filteredNCRs.filter(n => n.status === 'pending_review'),
          closed: filteredNCRs.filter(n => n.status === 'closed'),
        };
      }

      // Get KPIs
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [openCount, closedMTD, customerIssues] = await Promise.all([
        prisma.nCR.count({ where: { status: { not: 'closed' } } }),
        prisma.nCR.count({
          where: {
            status: 'closed',
            updatedAt: { gte: startOfMonth }
          }
        }),
        prisma.nCR.count({ where: { source: 'customer', status: { not: 'closed' } } }),
      ]);

      const duration = performance.now() - startTime;
      logger.info('NCRs fetched', { userId: user.id, total, durationMs: duration.toFixed(2) });

      return successResponse({
        items: params.view === 'kanban' ? null : filteredNCRs,
        kanban: kanbanData,
        total: params.severity ? filteredNCRs.length : total,
        page: params.page,
        pageSize: params.pageSize,
        totalPages: Math.ceil((params.severity ? filteredNCRs.length : total) / params.pageSize),
        kpis: {
          openNCRs: openCount,
          closedMTD,
          customerIssues,
        },
      });
    } catch (error) {
      logger.logError(error as Error, { context: 'quality-list' });
      return handleError(error);
    }
  },
  { permission: 'quality:read' }
);

// =============================================================================
// POST - Create NCR (requires quality:write permission)
// =============================================================================

export const POST = withAuth(
  async (request: NextRequest, { user }: { params: any; user: AuthUser }) => {
    const startTime = performance.now();

    try {
      const body = await request.json();

      // Validate input
      const validation = ncrCreateSchema.safeParse(body);
      if (!validation.success) {
        return handleError(validation.error);
      }

      const data = validation.data;
      const sanitizedData = sanitizeObject(data);

      logger.info('Creating NCR', {
        userId: user.id,
        source: sanitizedData.source
      });

      // Generate NCR number
      const lastNCR = await prisma.nCR.findFirst({
        orderBy: { ncrNumber: 'desc' }
      });
      const year = new Date().getFullYear();
      const nextNumber = lastNCR
        ? parseInt(lastNCR.ncrNumber.split('-')[2]) + 1
        : 1;
      const ncrNumber = `NCR-${year}-${String(nextNumber).padStart(4, '0')}`;

      // Create NCR
      const ncr = await prisma.nCR.create({
        data: {
          ncrNumber,
          source: sanitizedData.source,
          partId: sanitizedData.partId,
          title: sanitizedData.title,
          quantityAffected: sanitizedData.quantityAffected,
          description: sanitizedData.description,
          defectCategory: sanitizedData.defectCategory,
          preliminaryCause: sanitizedData.preliminaryCause,
          disposition: sanitizedData.disposition,
          totalCost: sanitizedData.totalCost,
          priority: sanitizedData.priority,
          status: 'open',
          createdBy: user.id,
        },
      });

      // Audit log
      logger.audit('CREATE', 'ncr', ncr.id, {
        ncrNumber: ncr.ncrNumber,
        source: ncr.source,
        userId: user.id
      });

      const duration = performance.now() - startTime;
      logger.info('NCR created', {
        userId: user.id,
        ncrId: ncr.id,
        ncrNumber: ncr.ncrNumber,
        durationMs: duration.toFixed(2)
      });

      return successResponse(ncr, 'NCR created successfully', 201);
    } catch (error) {
      logger.logError(error as Error, { context: 'quality-create' });
      return handleError(error);
    }
  },
  { permission: 'quality:write' }
);
