// ═══════════════════════════════════════════════════════════════════
//                    MOBILE QUALITY API
//              Quality inspection operations
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';

// Mock inspection data
const mockInspections = [
  {
    id: 'insp1',
    inspectionNumber: 'QC-2024-00001',
    type: 'Receiving',
    source: 'PO-2024-00001',
    partNumber: 'RTR-MOTOR-001',
    partDescription: 'Brushless DC Motor 2205',
    lotNumber: 'LOT-20240115-001',
    qtyToInspect: 50,
    qtyInspected: 0,
    status: 'Pending',
    priority: 'High',
    createdAt: '2024-01-15T10:00:00Z',
    dueDate: '2024-01-16',
    checkpoints: [
      { id: 'cp1', name: 'Visual Inspection', type: 'visual', required: true, result: null },
      { id: 'cp2', name: 'Dimension Check (±0.1mm)', type: 'measurement', required: true, result: null, spec: { min: 27.9, max: 28.1, unit: 'mm' } },
      { id: 'cp3', name: 'Weight Check (±1g)', type: 'measurement', required: true, result: null, spec: { min: 29, max: 31, unit: 'g' } },
      { id: 'cp4', name: 'Spin Test (30s)', type: 'functional', required: true, result: null },
    ],
  },
  {
    id: 'insp2',
    inspectionNumber: 'QC-2024-00002',
    type: 'In-Process',
    source: 'WO-2024-00001',
    partNumber: 'RTR-DRONE-HERA',
    partDescription: 'HERA X4 Pro Assembly',
    lotNumber: null,
    qtyToInspect: 10,
    qtyInspected: 5,
    status: 'In Progress',
    priority: 'Normal',
    createdAt: '2024-01-14T14:00:00Z',
    dueDate: '2024-01-17',
    checkpoints: [
      { id: 'cp5', name: 'Assembly Verification', type: 'visual', required: true, result: 'pass' },
      { id: 'cp6', name: 'Motor Connection Test', type: 'functional', required: true, result: 'pass' },
      { id: 'cp7', name: 'Balance Check', type: 'measurement', required: true, result: null, spec: { min: -0.5, max: 0.5, unit: 'g' } },
      { id: 'cp8', name: 'Flight Test (2min)', type: 'functional', required: true, result: null },
    ],
  },
  {
    id: 'insp3',
    inspectionNumber: 'QC-2024-00003',
    type: 'Final',
    source: 'SO-2024-00001',
    partNumber: 'RTR-DRONE-HERA',
    partDescription: 'HERA X4 Pro Assembly',
    lotNumber: null,
    qtyToInspect: 5,
    qtyInspected: 0,
    status: 'Pending',
    priority: 'Rush',
    createdAt: '2024-01-15T16:00:00Z',
    dueDate: '2024-01-16',
    checkpoints: [
      { id: 'cp9', name: 'Final Visual', type: 'visual', required: true, result: null },
      { id: 'cp10', name: 'Packaging Check', type: 'visual', required: true, result: null },
      { id: 'cp11', name: 'Documentation Complete', type: 'document', required: true, result: null },
    ],
  },
];

/**
 * GET /api/mobile/quality
 * Get pending inspections
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const inspectionId = searchParams.get('inspectionId');
  const status = searchParams.get('status') || 'Pending,In Progress';
  const type = searchParams.get('type');
  
  let results = mockInspections;
  
  // Filter by inspection ID
  if (inspectionId) {
    results = results.filter(insp => insp.id === inspectionId);
  }
  
  // Filter by status
  const statusList = status.split(',');
  results = results.filter(insp => statusList.includes(insp.status));
  
  // Filter by type
  if (type) {
    results = results.filter(insp => insp.type === type);
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
    pending: results.filter(i => i.status === 'Pending').length,
    inProgress: results.filter(i => i.status === 'In Progress').length,
    rushItems: results.filter(i => i.priority === 'Rush').length,
  };
  
  return NextResponse.json({
    success: true,
    data: results,
    summary,
  });
}

/**
 * POST /api/mobile/quality
 * Submit inspection result
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inspectionId, checkpointId, result, value, notes, qtyPassed, qtyFailed, disposition, userId } = body;
    
    // Validate for checkpoint result
    if (checkpointId) {
      if (!inspectionId || !result) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: inspectionId, checkpointId, result' },
          { status: 400 }
        );
      }
      
      if (!['pass', 'fail', 'conditional'].includes(result)) {
        return NextResponse.json(
          { success: false, error: 'Invalid result. Must be pass, fail, or conditional' },
          { status: 400 }
        );
      }
      
      // Find inspection and checkpoint
      const inspection = mockInspections.find(i => i.id === inspectionId);
      if (!inspection) {
        return NextResponse.json(
          { success: false, error: 'Inspection not found' },
          { status: 404 }
        );
      }
      
      const checkpoint = inspection.checkpoints.find(cp => cp.id === checkpointId);
      if (!checkpoint) {
        return NextResponse.json(
          { success: false, error: 'Checkpoint not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: `Checkpoint "${checkpoint.name}" recorded as ${result}`,
        data: {
          inspectionNumber: inspection.inspectionNumber,
          checkpointName: checkpoint.name,
          result,
          value,
          notes,
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    // Handle full inspection completion
    if (!inspectionId || qtyPassed === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields for inspection completion' },
        { status: 400 }
      );
    }
    
    const inspection = mockInspections.find(i => i.id === inspectionId);
    if (!inspection) {
      return NextResponse.json(
        { success: false, error: 'Inspection not found' },
        { status: 404 }
      );
    }
    
    const totalInspected = qtyPassed + (qtyFailed || 0);
    if (totalInspected > inspection.qtyToInspect - inspection.qtyInspected) {
      return NextResponse.json(
        { success: false, error: 'Quantity exceeds remaining to inspect' },
        { status: 400 }
      );
    }
    
    // Create inspection result
    const resultId = `QR-${Date.now()}`;
    
    return NextResponse.json({
      success: true,
      resultId,
      message: `Inspection recorded: ${qtyPassed} passed, ${qtyFailed || 0} failed`,
      data: {
        inspectionNumber: inspection.inspectionNumber,
        qtyPassed,
        qtyFailed: qtyFailed || 0,
        disposition,
        newTotalInspected: inspection.qtyInspected + totalInspected,
        remaining: inspection.qtyToInspect - inspection.qtyInspected - totalInspected,
        timestamp: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error('Quality API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process inspection' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/mobile/quality
 * Complete inspection
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { inspectionId, action, finalDisposition, notes } = body;
    
    if (!inspectionId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const inspection = mockInspections.find(i => i.id === inspectionId);
    if (!inspection) {
      return NextResponse.json(
        { success: false, error: 'Inspection not found' },
        { status: 404 }
      );
    }
    
    if (action === 'complete') {
      // Check all required checkpoints have results
      const incompleteCheckpoints = inspection.checkpoints.filter(
        cp => cp.required && !cp.result
      );
      
      if (incompleteCheckpoints.length > 0) {
        return NextResponse.json({
          success: false,
          error: `${incompleteCheckpoints.length} required checkpoints incomplete`,
          incompleteCheckpoints: incompleteCheckpoints.map(cp => cp.name),
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Inspection completed',
        data: {
          inspectionNumber: inspection.inspectionNumber,
          status: 'Completed',
          finalDisposition,
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Quality PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update inspection' },
      { status: 500 }
    );
  }
}
