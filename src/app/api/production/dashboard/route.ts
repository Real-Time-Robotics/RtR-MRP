// GET /api/production/dashboard?from=&to=
// Sprint 28 TIP-S28-08

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (request: NextRequest, _context, _session) => {
  const { searchParams } = new URL(request.url);
  const fromStr = searchParams.get('from');
  const toStr = searchParams.get('to');

  const now = new Date();
  const from = fromStr ? new Date(fromStr) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = toStr ? new Date(toStr) : new Date(from.getTime() + 24 * 60 * 60 * 1000);

  // Previous period (same duration, before "from")
  const duration = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - duration);
  const prevTo = from;

  // Current period aggregates
  const shiftReports = await prisma.shiftReport.findMany({
    where: { date: { gte: from, lt: to } },
    include: { workCenter: { select: { id: true, code: true, name: true } } },
  });

  const totalOutput = shiftReports.reduce((s, r) => s + r.totalOutput, 0);
  const totalScrap = shiftReports.reduce((s, r) => s + r.totalScrap, 0);
  const scrapRate = totalOutput + totalScrap > 0 ? totalScrap / (totalOutput + totalScrap) : 0;
  const totalDowntime = shiftReports.reduce((s, r) => s + r.totalDowntimeMinutes, 0);
  const totalLabor = shiftReports.reduce((s, r) => s + r.totalLaborMinutes, 0);

  // Previous period for trend comparison
  const prevReports = await prisma.shiftReport.findMany({
    where: { date: { gte: prevFrom, lt: prevTo } },
  });
  const prevOutput = prevReports.reduce((s, r) => s + r.totalOutput, 0);
  const prevScrap = prevReports.reduce((s, r) => s + r.totalScrap, 0);
  const prevScrapRate = prevOutput + prevScrap > 0 ? prevScrap / (prevOutput + prevScrap) : 0;

  // On-time WO rate
  const completedWOs = await prisma.workOrder.count({
    where: { status: 'completed', actualEnd: { gte: from, lt: to } },
  });
  const lateWOs = await prisma.workOrder.count({
    where: {
      status: 'completed',
      actualEnd: { gte: from, lt: to },
      dueDate: { not: null },
      AND: [{ actualEnd: { gt: prisma.workOrder.fields?.dueDate } }],
    },
  }).catch(() => 0); // Fallback if field comparison not supported
  const onTimeRate = completedWOs > 0 ? (completedWOs - lateWOs) / completedWOs : 1;

  // Per work center breakdown
  const wcMap = new Map<string, { code: string; name: string; output: number; scrap: number; downtime: number }>();
  for (const r of shiftReports) {
    const wcId = r.workCenter?.id || 'unknown';
    const existing = wcMap.get(wcId) || { code: r.workCenter?.code || '?', name: r.workCenter?.name || '?', output: 0, scrap: 0, downtime: 0 };
    existing.output += r.totalOutput;
    existing.scrap += r.totalScrap;
    existing.downtime += r.totalDowntimeMinutes;
    wcMap.set(wcId, existing);
  }

  // Daily trend (for chart)
  const dailyTrend: Array<{ date: string; output: number; scrap: number; downtime: number }> = [];
  const allReports = await prisma.shiftReport.findMany({
    where: { date: { gte: from, lt: to } },
    orderBy: { date: 'asc' },
  });

  const dayMap = new Map<string, { output: number; scrap: number; downtime: number }>();
  for (const r of allReports) {
    const dayKey = new Date(r.date).toISOString().split('T')[0];
    const existing = dayMap.get(dayKey) || { output: 0, scrap: 0, downtime: 0 };
    existing.output += r.totalOutput;
    existing.scrap += r.totalScrap;
    existing.downtime += r.totalDowntimeMinutes;
    dayMap.set(dayKey, existing);
  }
  for (const [date, data] of dayMap) {
    dailyTrend.push({ date, ...data });
  }

  // Top 5 downtime records
  const topDowntime = await prisma.downtimeRecord.findMany({
    where: { startTime: { gte: from, lt: to } },
    orderBy: { durationMinutes: 'desc' },
    take: 5,
    include: { workCenter: { select: { code: true, name: true } } },
  });

  return NextResponse.json({
    kpi: {
      totalOutput,
      totalScrap,
      scrapRate,
      totalDowntimeMinutes: totalDowntime,
      totalLaborMinutes: totalLabor,
      onTimeRate,
      completedWOs,
    },
    trend: {
      outputChange: prevOutput > 0 ? ((totalOutput - prevOutput) / prevOutput) * 100 : 0,
      scrapRateChange: prevScrapRate > 0 ? ((scrapRate - prevScrapRate) / prevScrapRate) * 100 : 0,
    },
    workCenterBreakdown: Array.from(wcMap.entries()).map(([id, data]) => ({ id, ...data })),
    dailyTrend,
    topDowntime: topDowntime.map((d) => ({
      id: d.id,
      workCenter: d.workCenter?.name || '?',
      reason: d.reason,
      durationMinutes: d.durationMinutes || 0,
      type: d.type,
    })),
  });
});
