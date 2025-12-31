import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - List certifications for a part
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const certifications = await prisma.partCertification.findMany({
      where: { partId: id },
      orderBy: { expiryDate: "asc" },
    });

    return NextResponse.json(certifications);
  } catch (error) {
    console.error("Failed to fetch certifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch certifications" },
      { status: 500 }
    );
  }
}

// POST - Add certification to part
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    const certification = await prisma.partCertification.create({
      data: {
        id: `CERT-${Date.now()}`,
        partId: id,
        certificationType: data.certificationType,
        certificateNumber: data.certificateNumber,
        issuingBody: data.issuingBody,
        issueDate: data.issueDate ? new Date(data.issueDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        documentUrl: data.documentUrl,
        verified: data.verified ?? false,
        verifiedBy: data.verified ? session.user?.email : null,
        verifiedDate: data.verified ? new Date() : null,
        notes: data.notes,
      },
    });

    return NextResponse.json(certification, { status: 201 });
  } catch (error) {
    console.error("Failed to create certification:", error);
    return NextResponse.json(
      { error: "Failed to create certification" },
      { status: 500 }
    );
  }
}
