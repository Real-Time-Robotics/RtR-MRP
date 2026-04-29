// ShiftReport service — auto-aggregate from LaborEntry + DowntimeRecord
// Sprint 28 TIP-S28-07

import prisma from '@/lib/prisma';

interface GenerateParams {
  date: Date;
  shiftId: string;
  workCenterId: string;
  generatedByUserId?: string;
}

export async function generateShiftReport(params: GenerateParams) {
  const { date, shiftId, workCenterId, generatedByUserId } = params;

  // Aggregate LaborEntry for this date + workCenter
  const laborEntries = await prisma.laborEntry.findMany({
    where: {
      workCenterId,
      startTime: {
        gte: new Date(date.toISOString().split('T')[0]),
        lt: new Date(new Date(date).setDate(date.getDate() + 1)),
      },
    },
    select: {
      id: true,
      quantityProduced: true,
      quantityScrapped: true,
      durationMinutes: true,
    },
  });

  const totalOutput = laborEntries.reduce((sum, e) => sum + (e.quantityProduced || 0), 0);
  const totalScrap = laborEntries.reduce((sum, e) => sum + (e.quantityScrapped || 0), 0);
  const totalLaborMinutes = laborEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
  const scrapRate = totalOutput > 0 ? totalScrap / (totalOutput + totalScrap) : null;

  // Aggregate DowntimeRecord
  const downtimeRecords = await prisma.downtimeRecord.findMany({
    where: {
      workCenterId,
      startTime: {
        gte: new Date(date.toISOString().split('T')[0]),
        lt: new Date(new Date(date).setDate(date.getDate() + 1)),
      },
    },
    select: { id: true, durationMinutes: true },
  });

  const totalDowntimeMinutes = downtimeRecords.reduce(
    (sum, d) => sum + (d.durationMinutes || 0),
    0
  );

  // Headcount from ShiftAssignment
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      shiftId,
      date,
    },
    select: { id: true, status: true },
  });

  const headcountPlanned = assignments.length;
  const headcountActual = assignments.filter(
    (a) => a.status === 'checked_in' || a.status === 'checked_out'
  ).length;

  // Upsert (idempotent re-generate)
  const report = await prisma.shiftReport.upsert({
    where: {
      date_shiftId_workCenterId: { date, shiftId, workCenterId },
    },
    update: {
      totalOutput,
      totalScrap,
      scrapRate,
      totalLaborMinutes,
      totalDowntimeMinutes,
      headcountPlanned,
      headcountActual,
      laborEntryIds: laborEntries.map((e) => e.id),
      downtimeRecordIds: downtimeRecords.map((d) => d.id),
      generatedAt: new Date(),
      generatedByUserId,
    },
    create: {
      date,
      shiftId,
      workCenterId,
      totalOutput,
      totalScrap,
      scrapRate,
      totalLaborMinutes,
      totalDowntimeMinutes,
      headcountPlanned,
      headcountActual,
      laborEntryIds: laborEntries.map((e) => e.id),
      downtimeRecordIds: downtimeRecords.map((d) => d.id),
      generatedByUserId,
    },
  });

  return report;
}
