// ═══════════════════════════════════════════════════════════════════
//                    MOBILE WORK ORDER API
//              Work order operations for shop floor
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';

// Mock work orders
const mockWorkOrders = [
  {
    id: 'wo1',
    woNumber: 'WO-2024-00001',
    partNumber: 'RTR-DRONE-HERA',
    partDescription: 'HERA X4 Pro Assembly',
    qty: 50,
    qtyCompleted: 25,
    status: 'In Progress',
    priority: 'High',
    startDate: '2024-01-15',
    dueDate: '2024-01-20',
    workCenter: 'Assembly Line 1',
    currentOperation: {
      id: 'op2',
      name: 'Final Assembly',
      sequence: 20,
      status: 'In Progress',
      plannedHours: 4,
      actualHours: 2.5,
    },
    operations: [
      { id: 'op1', sequence: 10, name: 'Motor Installation', status: 'Completed', plannedHours: 2, actualHours: 1.8 },
      { id: 'op2', sequence: 20, name: 'Final Assembly', status: 'In Progress', plannedHours: 4, actualHours: 2.5 },
      { id: 'op3', sequence: 30, name: 'Quality Check', status: 'Pending', plannedHours: 1, actualHours: 0 },
      { id: 'op4', sequence: 40, name: 'Packaging', status: 'Pending', plannedHours: 0.5, actualHours: 0 },
    ],
  },
  {
    id: 'wo2',
    woNumber: 'WO-2024-00002',
    partNumber: 'RTR-DRONE-ZEUS',
    partDescription: 'ZEUS H6 Heavy Assembly',
    qty: 25,
    qtyCompleted: 0,
    status: 'Released',
    priority: 'Normal',
    startDate: '2024-01-18',
    dueDate: '2024-01-25',
    workCenter: 'Assembly Line 2',
    currentOperation: null,
    operations: [
      { id: 'op5', sequence: 10, name: 'Frame Assembly', status: 'Pending', plannedHours: 3, actualHours: 0 },
      { id: 'op6', sequence: 20, name: 'Motor Installation', status: 'Pending', plannedHours: 2, actualHours: 0 },
      { id: 'op7', sequence: 30, name: 'Electronics Setup', status: 'Pending', plannedHours: 3, actualHours: 0 },
      { id: 'op8', sequence: 40, name: 'Final Assembly', status: 'Pending', plannedHours: 4, actualHours: 0 },
      { id: 'op9', sequence: 50, name: 'Flight Test', status: 'Pending', plannedHours: 2, actualHours: 0 },
    ],
  },
  {
    id: 'wo3',
    woNumber: 'WO-2024-00003',
    partNumber: 'RTR-DRONE-ATHENA',
    partDescription: 'ATHENA Mini Racing',
    qty: 100,
    qtyCompleted: 80,
    status: 'In Progress',
    priority: 'Rush',
    startDate: '2024-01-12',
    dueDate: '2024-01-17',
    workCenter: 'Assembly Line 1',
    currentOperation: {
      id: 'op12',
      name: 'Packaging',
      sequence: 40,
      status: 'In Progress',
      plannedHours: 2,
      actualHours: 1.5,
    },
    operations: [
      { id: 'op10', sequence: 10, name: 'Quick Assembly', status: 'Completed', plannedHours: 3, actualHours: 2.8 },
      { id: 'op11', sequence: 20, name: 'Testing', status: 'Completed', plannedHours: 1.5, actualHours: 1.4 },
      { id: 'op12', sequence: 30, name: 'Packaging', status: 'In Progress', plannedHours: 2, actualHours: 1.5 },
    ],
  },
];

/**
 * GET /api/mobile/workorder
 * Get work orders
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const woId = searchParams.get('woId');
  const status = searchParams.get('status') || 'Released,In Progress';
  const workCenter = searchParams.get('workCenter');
  
  let results = mockWorkOrders;
  
  // Filter by WO ID
  if (woId) {
    results = results.filter(wo => wo.id === woId);
  }
  
  // Filter by status
  const statusList = status.split(',');
  results = results.filter(wo => statusList.includes(wo.status));
  
  // Filter by work center
  if (workCenter) {
    results = results.filter(wo => wo.workCenter === workCenter);
  }
  
  // Sort by priority and due date
  const priorityOrder = { 'Rush': 0, 'High': 1, 'Normal': 2, 'Low': 3 };
  results.sort((a, b) => {
    const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 99) - 
                         (priorityOrder[b.priority as keyof typeof priorityOrder] || 99);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
  
  // Calculate summary
  const summary = {
    total: results.length,
    inProgress: results.filter(wo => wo.status === 'In Progress').length,
    released: results.filter(wo => wo.status === 'Released').length,
    rushOrders: results.filter(wo => wo.priority === 'Rush').length,
    behindSchedule: results.filter(wo => new Date(wo.dueDate) < new Date()).length,
  };
  
  return NextResponse.json({
    success: true,
    data: results,
    summary,
  });
}

/**
 * POST /api/mobile/workorder
 * Work order operations
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, woId, operationId, data } = body;
    
    if (!woId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: woId, action' },
        { status: 400 }
      );
    }
    
    const wo = mockWorkOrders.find(w => w.id === woId);
    if (!wo) {
      return NextResponse.json(
        { success: false, error: 'Work order not found' },
        { status: 404 }
      );
    }
    
    switch (action) {
      case 'start_operation': {
        if (!operationId) {
          return NextResponse.json(
            { success: false, error: 'Operation ID required' },
            { status: 400 }
          );
        }
        
        const operation = wo.operations.find(op => op.id === operationId);
        if (!operation) {
          return NextResponse.json(
            { success: false, error: 'Operation not found' },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          success: true,
          message: `Started operation: ${operation.name}`,
          data: {
            woNumber: wo.woNumber,
            operationName: operation.name,
            startedAt: new Date().toISOString(),
          },
        });
      }
      
      case 'complete_operation': {
        if (!operationId) {
          return NextResponse.json(
            { success: false, error: 'Operation ID required' },
            { status: 400 }
          );
        }
        
        const operation = wo.operations.find(op => op.id === operationId);
        if (!operation) {
          return NextResponse.json(
            { success: false, error: 'Operation not found' },
            { status: 404 }
          );
        }
        
        const { qtyCompleted, qtyScrap, actualHours, notes } = data || {};
        
        return NextResponse.json({
          success: true,
          message: `Completed operation: ${operation.name}`,
          data: {
            woNumber: wo.woNumber,
            operationName: operation.name,
            qtyCompleted: qtyCompleted || 0,
            qtyScrap: qtyScrap || 0,
            actualHours: actualHours || operation.actualHours,
            completedAt: new Date().toISOString(),
          },
        });
      }
      
      case 'record_production': {
        const { qtyGood, qtyScrap, notes } = data || {};
        
        if (qtyGood === undefined) {
          return NextResponse.json(
            { success: false, error: 'Quantity required' },
            { status: 400 }
          );
        }
        
        const newCompleted = wo.qtyCompleted + qtyGood + (qtyScrap || 0);
        if (newCompleted > wo.qty) {
          return NextResponse.json(
            { success: false, error: `Total would exceed WO quantity (${wo.qty})` },
            { status: 400 }
          );
        }
        
        return NextResponse.json({
          success: true,
          message: `Recorded production: ${qtyGood} good, ${qtyScrap || 0} scrap`,
          data: {
            woNumber: wo.woNumber,
            qtyGood,
            qtyScrap: qtyScrap || 0,
            newTotalCompleted: newCompleted,
            remaining: wo.qty - newCompleted,
            recordedAt: new Date().toISOString(),
          },
        });
      }
      
      case 'report_issue': {
        const { issueType, description, severity } = data || {};
        
        if (!issueType || !description) {
          return NextResponse.json(
            { success: false, error: 'Issue type and description required' },
            { status: 400 }
          );
        }
        
        const issueId = `ISS-${Date.now()}`;
        
        return NextResponse.json({
          success: true,
          issueId,
          message: 'Issue reported successfully',
          data: {
            woNumber: wo.woNumber,
            issueType,
            severity: severity || 'Medium',
            description,
            reportedAt: new Date().toISOString(),
          },
        });
      }
      
      case 'clock_in': {
        return NextResponse.json({
          success: true,
          message: `Clocked in to WO ${wo.woNumber}`,
          data: {
            woNumber: wo.woNumber,
            clockedInAt: new Date().toISOString(),
          },
        });
      }
      
      case 'clock_out': {
        const { hoursWorked, breakMinutes } = data || {};
        
        return NextResponse.json({
          success: true,
          message: `Clocked out from WO ${wo.woNumber}`,
          data: {
            woNumber: wo.woNumber,
            hoursWorked: hoursWorked || 0,
            breakMinutes: breakMinutes || 0,
            clockedOutAt: new Date().toISOString(),
          },
        });
      }
      
      default:
        return NextResponse.json(
          { success: false, error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Work order API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process work order operation' },
      { status: 500 }
    );
  }
}
