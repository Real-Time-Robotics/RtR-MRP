import { prisma } from '@/lib/prisma';
import { Prisma, PRAction, PRLineStatus, PRStatus, PRPriority } from '@prisma/client';
import { generatePRNumber } from './pr-number';

// ============================================================================
// TYPES
// ============================================================================

export interface PRLineInput {
  partId?: string | null;
  itemDescription?: string | null;
  itemCode?: string | null;
  requestedQty: number;
  unit?: string;
  estimatedPrice?: number | null;
  preferredSupplierId?: string | null;
  requiredDate?: Date | string | null;
  notes?: string | null;
  specifications?: Prisma.InputJsonValue | null;
}

export interface CreatePRInput {
  title: string;
  description?: string;
  priority?: PRPriority;
  requiredDate: Date | string;
  departmentId?: string;
  currency?: string;
  budgetCode?: string;
  costCenter?: string;
  lines: PRLineInput[];
}

export interface ConvertToPOOptions {
  orderDate?: Date | string;
  expectedDate?: Date | string;
  currency?: string;
  notes?: string;
  /**
   * When true (default), eligible lines across all PRs are grouped by
   * supplier — one PO per supplier. When false, one PO is created per PR
   * (still grouped by supplier within that PR).
   */
  consolidate?: boolean;
}

export class PRServiceError extends Error {
  constructor(message: string, public code: string = 'PR_ERROR') {
    super(message);
    this.name = 'PRServiceError';
  }
}

const REJECTION_MIN_LENGTH = 10;

// ============================================================================
// HELPERS
// ============================================================================

function computeLineTotals(lines: PRLineInput[]) {
  return lines.map((line, idx) => {
    const qty = Number(line.requestedQty);
    const price = line.estimatedPrice != null ? Number(line.estimatedPrice) : null;
    const total = price != null ? qty * price : null;
    return {
      lineNumber: idx + 1,
      partId: line.partId ?? null,
      itemDescription: line.itemDescription ?? null,
      itemCode: line.itemCode ?? null,
      requestedQty: new Prisma.Decimal(qty),
      unit: line.unit ?? 'EA',
      estimatedPrice: price != null ? new Prisma.Decimal(price) : null,
      estimatedTotal: total != null ? new Prisma.Decimal(total) : null,
      preferredSupplierId: line.preferredSupplierId ?? null,
      requiredDate: line.requiredDate ? new Date(line.requiredDate) : null,
      notes: line.notes ?? null,
      specifications: line.specifications ?? undefined,
    };
  });
}

function sumEstimated(lines: ReturnType<typeof computeLineTotals>): Prisma.Decimal {
  return lines.reduce(
    (acc, l) => (l.estimatedTotal ? acc.add(l.estimatedTotal) : acc),
    new Prisma.Decimal(0),
  );
}

async function generatePONumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const last = await tx.purchaseOrder.findFirst({
    where: { poNumber: { startsWith: prefix } },
    orderBy: { poNumber: 'desc' },
    select: { poNumber: true },
  });
  let n = 1;
  if (last) {
    const parsed = parseInt(last.poNumber.replace(prefix, ''), 10);
    if (!isNaN(parsed)) n = parsed + 1;
  }
  return `${prefix}${String(n).padStart(5, '0')}`;
}

async function recordHistory(
  tx: Prisma.TransactionClient,
  args: {
    prId: string;
    action: PRAction;
    actorId: string;
    fromStatus?: PRStatus | null;
    toStatus?: PRStatus | null;
    details?: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  await tx.pRHistory.create({
    data: {
      prId: args.prId,
      action: args.action,
      actorId: args.actorId,
      fromStatus: args.fromStatus ?? null,
      toStatus: args.toStatus ?? null,
      details: args.details ?? null,
      metadata: args.metadata,
    },
  });
}

// ============================================================================
// SERVICE
// ============================================================================

export const PRService = {
  async createPR(input: CreatePRInput, requesterId: string) {
    if (!input.lines || input.lines.length === 0) {
      throw new PRServiceError('PR must have at least one line item', 'PR_NO_LINES');
    }

    const lines = computeLineTotals(input.lines);
    const estimatedTotal = sumEstimated(lines);
    const prNumber = await generatePRNumber();

    return prisma.$transaction(async (tx) => {
      const pr = await tx.purchaseRequest.create({
        data: {
          prNumber,
          title: input.title,
          description: input.description,
          priority: input.priority ?? PRPriority.NORMAL,
          requesterId,
          departmentId: input.departmentId,
          requiredDate: new Date(input.requiredDate),
          estimatedTotal,
          currency: input.currency ?? 'VND',
          budgetCode: input.budgetCode,
          costCenter: input.costCenter,
          status: PRStatus.DRAFT,
          lines: { create: lines },
        },
        include: { lines: true },
      });

      await recordHistory(tx, {
        prId: pr.id,
        action: PRAction.CREATED,
        actorId: requesterId,
        toStatus: PRStatus.DRAFT,
        details: `PR ${pr.prNumber} created with ${lines.length} line(s)`,
      });

      return pr;
    });
  },

  async submitPR(prId: string, submitterId: string) {
    return prisma.$transaction(async (tx) => {
      const pr = await tx.purchaseRequest.findUnique({ where: { id: prId } });
      if (!pr) throw new PRServiceError('PR not found', 'PR_NOT_FOUND');
      if (pr.status !== PRStatus.DRAFT && pr.status !== PRStatus.REVISED) {
        throw new PRServiceError(
          `Cannot submit PR in status ${pr.status}`,
          'PR_INVALID_STATE',
        );
      }

      const updated = await tx.purchaseRequest.update({
        where: { id: prId },
        data: { status: PRStatus.PENDING },
      });

      await recordHistory(tx, {
        prId,
        action: PRAction.SUBMITTED,
        actorId: submitterId,
        fromStatus: pr.status,
        toStatus: PRStatus.PENDING,
      });

      return updated;
    });
  },

  async approvePR(prId: string, approverId: string, notes?: string) {
    return prisma.$transaction(async (tx) => {
      const pr = await tx.purchaseRequest.findUnique({ where: { id: prId } });
      if (!pr) throw new PRServiceError('PR not found', 'PR_NOT_FOUND');
      if (pr.status !== PRStatus.PENDING) {
        throw new PRServiceError(
          `Cannot approve PR in status ${pr.status}`,
          'PR_INVALID_STATE',
        );
      }

      const updated = await tx.purchaseRequest.update({
        where: { id: prId },
        data: {
          status: PRStatus.APPROVED,
          approvedBy: approverId,
          approvedAt: new Date(),
        },
      });

      await tx.purchaseRequestLine.updateMany({
        where: { prId, lineStatus: PRLineStatus.PENDING },
        data: { lineStatus: PRLineStatus.APPROVED },
      });

      await recordHistory(tx, {
        prId,
        action: PRAction.APPROVED,
        actorId: approverId,
        fromStatus: PRStatus.PENDING,
        toStatus: PRStatus.APPROVED,
        details: notes,
      });

      return updated;
    });
  },

  async rejectPR(prId: string, rejecterId: string, reason: string) {
    const trimmed = (reason ?? '').trim();
    if (trimmed.length < REJECTION_MIN_LENGTH) {
      throw new PRServiceError(
        `Rejection reason must be at least ${REJECTION_MIN_LENGTH} characters`,
        'PR_REJECTION_REASON_REQUIRED',
      );
    }

    return prisma.$transaction(async (tx) => {
      const pr = await tx.purchaseRequest.findUnique({ where: { id: prId } });
      if (!pr) throw new PRServiceError('PR not found', 'PR_NOT_FOUND');
      if (pr.status !== PRStatus.PENDING) {
        throw new PRServiceError(
          `Cannot reject PR in status ${pr.status}`,
          'PR_INVALID_STATE',
        );
      }

      const updated = await tx.purchaseRequest.update({
        where: { id: prId },
        data: {
          status: PRStatus.REJECTED,
          rejectedBy: rejecterId,
          rejectedAt: new Date(),
          rejectionReason: trimmed,
        },
      });

      await recordHistory(tx, {
        prId,
        action: PRAction.REJECTED,
        actorId: rejecterId,
        fromStatus: PRStatus.PENDING,
        toStatus: PRStatus.REJECTED,
        details: trimmed,
      });

      return updated;
    });
  },

  async revisePR(
    prId: string,
    reviserId: string,
    updates: Partial<CreatePRInput>,
  ) {
    return prisma.$transaction(async (tx) => {
      const pr = await tx.purchaseRequest.findUnique({
        where: { id: prId },
        include: { lines: true },
      });
      if (!pr) throw new PRServiceError('PR not found', 'PR_NOT_FOUND');
      if (pr.status !== PRStatus.REJECTED && pr.status !== PRStatus.DRAFT) {
        throw new PRServiceError(
          `Cannot revise PR in status ${pr.status}`,
          'PR_INVALID_STATE',
        );
      }

      let estimatedTotal: Prisma.Decimal | undefined;
      if (updates.lines && updates.lines.length > 0) {
        const newLines = computeLineTotals(updates.lines);
        estimatedTotal = sumEstimated(newLines);
        await tx.purchaseRequestLine.deleteMany({ where: { prId } });
        await tx.purchaseRequestLine.createMany({
          data: newLines.map((l) => ({ ...l, prId })),
        });
      }

      const updated = await tx.purchaseRequest.update({
        where: { id: prId },
        data: {
          status: PRStatus.REVISED,
          revisionNumber: pr.revisionNumber + 1,
          title: updates.title ?? pr.title,
          description: updates.description ?? pr.description,
          priority: updates.priority ?? pr.priority,
          requiredDate: updates.requiredDate
            ? new Date(updates.requiredDate)
            : pr.requiredDate,
          estimatedTotal: estimatedTotal ?? pr.estimatedTotal,
          rejectedBy: null,
          rejectedAt: null,
          rejectionReason: null,
        },
      });

      await recordHistory(tx, {
        prId,
        action: PRAction.REVISED,
        actorId: reviserId,
        fromStatus: pr.status,
        toStatus: PRStatus.REVISED,
        details: `Revision #${pr.revisionNumber + 1}`,
      });

      return updated;
    });
  },

  /**
   * In-place edit by the requester while the PR is still DRAFT or REVISED.
   * If `lines` is provided, all existing lines are replaced.
   */
  async updatePR(
    prId: string,
    actorId: string,
    updates: Partial<CreatePRInput>,
  ) {
    return prisma.$transaction(async (tx) => {
      const pr = await tx.purchaseRequest.findUnique({
        where: { id: prId },
        include: { lines: true },
      });
      if (!pr) throw new PRServiceError('PR not found', 'PR_NOT_FOUND');
      if (pr.requesterId !== actorId) {
        throw new PRServiceError(
          'Only the requester can edit this PR',
          'PR_FORBIDDEN',
        );
      }
      if (pr.status !== PRStatus.DRAFT && pr.status !== PRStatus.REVISED) {
        throw new PRServiceError(
          `Cannot edit PR in status ${pr.status}`,
          'PR_INVALID_STATE',
        );
      }

      let estimatedTotal: Prisma.Decimal | undefined;
      if (updates.lines) {
        if (updates.lines.length === 0) {
          throw new PRServiceError('PR must have at least one line', 'PR_NO_LINES');
        }
        const newLines = computeLineTotals(updates.lines);
        estimatedTotal = sumEstimated(newLines);
        await tx.purchaseRequestLine.deleteMany({ where: { prId } });
        await tx.purchaseRequestLine.createMany({
          data: newLines.map((l) => ({ ...l, prId })),
        });
      }

      const updated = await tx.purchaseRequest.update({
        where: { id: prId },
        data: {
          title: updates.title ?? pr.title,
          description: updates.description ?? pr.description,
          priority: updates.priority ?? pr.priority,
          requiredDate: updates.requiredDate
            ? new Date(updates.requiredDate)
            : pr.requiredDate,
          budgetCode: updates.budgetCode ?? pr.budgetCode,
          costCenter: updates.costCenter ?? pr.costCenter,
          estimatedTotal: estimatedTotal ?? pr.estimatedTotal,
        },
      });

      await recordHistory(tx, {
        prId,
        action: PRAction.LINE_UPDATED,
        actorId,
        details: 'PR updated by requester',
      });

      return updated;
    });
  },

  async cancelPR(prId: string, actorId: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const pr = await tx.purchaseRequest.findUnique({ where: { id: prId } });
      if (!pr) throw new PRServiceError('PR not found', 'PR_NOT_FOUND');
      if (pr.status === PRStatus.PO_CREATED || pr.status === PRStatus.COMPLETED) {
        throw new PRServiceError(
          `Cannot cancel PR in status ${pr.status}`,
          'PR_INVALID_STATE',
        );
      }

      const updated = await tx.purchaseRequest.update({
        where: { id: prId },
        data: { status: PRStatus.CANCELLED },
      });

      await recordHistory(tx, {
        prId,
        action: PRAction.CANCELLED,
        actorId,
        fromStatus: pr.status,
        toStatus: PRStatus.CANCELLED,
        details: reason,
      });

      return updated;
    });
  },

  /**
   * Convert one or more approved PRs into a single PO per supplier.
   * Only lines with a partId + preferredSupplierId + estimatedPrice are
   * eligible. Lines without a supplier are skipped.
   * Returns array of created PO ids.
   */
  async convertToPO(
    prIds: string[],
    creatorId: string,
    options: ConvertToPOOptions = {},
  ): Promise<string[]> {
    if (prIds.length === 0) {
      throw new PRServiceError('No PRs provided', 'PR_EMPTY_BATCH');
    }

    return prisma.$transaction(async (tx) => {
      const prs = await tx.purchaseRequest.findMany({
        where: { id: { in: prIds } },
        include: { lines: true },
      });

      if (prs.length !== prIds.length) {
        throw new PRServiceError('One or more PRs not found', 'PR_NOT_FOUND');
      }

      for (const pr of prs) {
        if (pr.status !== PRStatus.APPROVED) {
          throw new PRServiceError(
            `PR ${pr.prNumber} is not approved (status: ${pr.status})`,
            'PR_NOT_APPROVED',
          );
        }
      }

      // Group eligible lines by supplier — optionally also by PR when
      // `consolidate` is false (one PO per PR per supplier).
      type EligibleLine = {
        prId: string;
        lineId: string;
        partId: string;
        requestedQty: number;
        estimatedPrice: number;
        supplierId: string;
      };
      const consolidate = options.consolidate ?? true;
      const groups = new Map<string, EligibleLine[]>();

      for (const pr of prs) {
        for (const line of pr.lines) {
          if (
            !line.partId ||
            !line.preferredSupplierId ||
            line.estimatedPrice == null
          ) {
            continue;
          }
          const entry: EligibleLine = {
            prId: pr.id,
            lineId: line.id,
            partId: line.partId,
            requestedQty: Number(line.requestedQty),
            estimatedPrice: Number(line.estimatedPrice),
            supplierId: line.preferredSupplierId,
          };
          const key = consolidate
            ? entry.supplierId
            : `${pr.id}::${entry.supplierId}`;
          const bucket = groups.get(key) ?? [];
          bucket.push(entry);
          groups.set(key, bucket);
        }
      }

      if (groups.size === 0) {
        throw new PRServiceError(
          'No eligible lines to convert (need partId + supplier + price)',
          'PR_NO_ELIGIBLE_LINES',
        );
      }

      const orderDate = options.orderDate ? new Date(options.orderDate) : new Date();
      const expectedDate = options.expectedDate
        ? new Date(options.expectedDate)
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const createdPOIds: string[] = [];

      for (const [, lines] of groups) {
        const supplierId = lines[0].supplierId;
        const poNumber = await generatePONumber(tx);
        const totalAmount = lines.reduce(
          (s, l) => s + l.requestedQty * l.estimatedPrice,
          0,
        );

        const po = await tx.purchaseOrder.create({
          data: {
            poNumber,
            supplierId,
            orderDate,
            expectedDate,
            status: 'draft',
            currency: options.currency ?? 'USD',
            notes: options.notes,
            totalAmount,
            lines: {
              create: lines.map((l, idx) => ({
                lineNumber: idx + 1,
                partId: l.partId,
                quantity: Math.max(1, Math.round(l.requestedQty)),
                unitPrice: l.estimatedPrice,
                lineTotal: l.requestedQty * l.estimatedPrice,
              })),
            },
          },
          include: { lines: true },
        });

        createdPOIds.push(po.id);

        // Update PR lines + track back-reference.
        for (let i = 0; i < lines.length; i++) {
          await tx.purchaseRequestLine.update({
            where: { id: lines[i].lineId },
            data: {
              lineStatus: PRLineStatus.ORDERED,
              orderedQty: new Prisma.Decimal(lines[i].requestedQty),
              poLineId: po.lines[i]?.id ?? null,
            },
          });
        }
      }

      // Mark each PR as PO_CREATED (or PARTIALLY_ORDERED if some lines skipped).
      for (const pr of prs) {
        const total = pr.lines.length;
        const ordered = await tx.purchaseRequestLine.count({
          where: { prId: pr.id, lineStatus: PRLineStatus.ORDERED },
        });
        const status =
          ordered === total ? PRStatus.PO_CREATED : PRStatus.PARTIALLY_ORDERED;

        await tx.purchaseRequest.update({
          where: { id: pr.id },
          data: {
            status,
            convertedToPO: true,
            purchaseOrderId: createdPOIds[0],
          },
        });

        await recordHistory(tx, {
          prId: pr.id,
          action: PRAction.CONVERTED_TO_PO,
          actorId: creatorId,
          fromStatus: PRStatus.APPROVED,
          toStatus: status,
          details: `Created ${createdPOIds.length} PO(s)`,
          metadata: { poIds: createdPOIds },
        });
      }

      return createdPOIds;
    });
  },

  async getPRPipelineStatus(prId: string) {
    const pr = await prisma.purchaseRequest.findUnique({
      where: { id: prId },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        approvedByUser: { select: { id: true, name: true, email: true } },
        rejectedByUser: { select: { id: true, name: true, email: true } },
        lines: {
          orderBy: { lineNumber: 'asc' },
          include: {
            part: { select: { id: true, partNumber: true, name: true } },
            preferredSupplier: { select: { id: true, code: true, name: true } },
          },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          include: { actor: { select: { id: true, name: true } } },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, name: true } } },
        },
        attachments: {
          include: { uploader: { select: { id: true, name: true } } },
        },
        purchaseOrder: {
          select: { id: true, poNumber: true, status: true, expectedDate: true },
        },
      },
    });
    if (!pr) throw new PRServiceError('PR not found', 'PR_NOT_FOUND');
    return pr;
  },

  /**
   * Detail response shaped for the UI: { pr, approval, conversion, lines, history }.
   */
  async getPRDetailShaped(prId: string) {
    const pr = await this.getPRPipelineStatus(prId);

    const approvalStatus =
      pr.status === PRStatus.APPROVED
        ? 'APPROVED'
        : pr.status === PRStatus.REJECTED
          ? 'REJECTED'
          : pr.status === PRStatus.PENDING
            ? 'PENDING'
            : 'NOT_SUBMITTED';

    return {
      pr: {
        id: pr.id,
        prNumber: pr.prNumber,
        title: pr.title,
        description: pr.description,
        status: pr.status,
        priority: pr.priority,
        estimatedTotal: pr.estimatedTotal,
        currency: pr.currency,
        budgetCode: pr.budgetCode,
        costCenter: pr.costCenter,
        requestDate: pr.requestDate,
        requiredDate: pr.requiredDate,
        revisionNumber: pr.revisionNumber,
        requester: pr.requester,
      },
      approval: {
        status: approvalStatus,
        approvedBy: pr.approvedByUser,
        approvedAt: pr.approvedAt,
        rejectedBy: pr.rejectedByUser,
        rejectedAt: pr.rejectedAt,
        rejectionReason: pr.rejectionReason,
      },
      conversion: {
        converted: pr.convertedToPO,
        purchaseOrder: pr.purchaseOrder,
      },
      lines: pr.lines.map((l) => ({
        id: l.id,
        lineNumber: l.lineNumber,
        description: l.itemDescription,
        itemCode: l.itemCode,
        part: l.part,
        preferredSupplier: l.preferredSupplier,
        requestedQty: l.requestedQty,
        unit: l.unit,
        estimatedPrice: l.estimatedPrice,
        estimatedTotal: l.estimatedTotal,
        lineStatus: l.lineStatus,
        notes: l.notes,
        orderedQty: l.orderedQty,
        poLineId: l.poLineId,
      })),
      history: pr.history.map((h) => ({
        id: h.id,
        action: h.action,
        details: h.details,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        actor: h.actor,
        createdAt: h.createdAt,
      })),
      comments: pr.comments,
      attachments: pr.attachments,
    };
  },

  async trackPRLineById(lineId: string) {
    const line = await prisma.purchaseRequestLine.findUnique({
      where: { id: lineId },
      include: {
        pr: {
          select: {
            id: true,
            prNumber: true,
            status: true,
            requesterId: true,
            purchaseOrderId: true,
          },
        },
        part: { select: { id: true, partNumber: true, name: true } },
        preferredSupplier: { select: { id: true, code: true, name: true } },
      },
    });
    if (!line) throw new PRServiceError('PR line not found', 'PR_LINE_NOT_FOUND');

    let poLine = null;
    if (line.poLineId) {
      poLine = await prisma.purchaseOrderLine.findUnique({
        where: { id: line.poLineId },
        include: {
          po: { select: { id: true, poNumber: true, status: true } },
        },
      });
    }

    return { line, poLine };
  },

  async searchPRs(query: {
    search?: string;
    status?: PRStatus;
    requesterId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(200, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseRequestWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.requesterId) where.requesterId = query.requesterId;
    if (query.search) {
      where.OR = [
        { prNumber: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [total, items] = await Promise.all([
      prisma.purchaseRequest.count({ where }),
      prisma.purchaseRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          _count: { select: { lines: true } },
        },
      }),
    ]);
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },
};
