// src/app/api/excel/templates/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from '@/lib/api/with-auth';
import { prisma } from "@/lib/prisma";
import { generateImportTemplate, getFieldDefinitions, defaultColumnDefinitions } from "@/lib/excel";
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit } from '@/lib/rate-limit';
// GET - List available templates or download specific template
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const download = searchParams.get("download") === "true";

    if (type && download) {
      // Generate and download template
      const result = generateImportTemplate(type, true);

      if (!result.success || !result.buffer) {
        return NextResponse.json(
          { error: result.error || "Template generation failed" },
          { status: 500 }
        );
      }

      // Update download count if template exists in DB
      await prisma.excelTemplate.updateMany({
        where: { type, isActive: true },
        data: {
          downloadCount: { increment: 1 },
          lastDownloadAt: new Date(),
        },
      });

      const fileName = `${type}_import_template.xlsx`;
      const headers = new Headers();
      headers.set(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      headers.set("Content-Disposition", `attachment; filename="${fileName}"`);

      // Convert Buffer to Uint8Array for NextResponse
      const responseBody = new Uint8Array(result.buffer);
      return new NextResponse(responseBody, { headers });
    }

    if (type) {
      // Get template info for specific type
      const fields = getFieldDefinitions(type);
      const columns = defaultColumnDefinitions[type] || [];

      // Get template from DB if exists
      const dbTemplate = await prisma.excelTemplate.findFirst({
        where: { type, isActive: true },
      });

      return NextResponse.json({
        type,
        name: getTemplateDisplayName(type),
        description: getTemplateDescription(type),
        fields: fields.map((f) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          required: f.required,
          defaultValue: f.defaultValue,
        })),
        columns: columns.map((c) => ({
          header: c.header,
          key: c.key,
          format: c.format,
        })),
        downloadCount: dbTemplate?.downloadCount || 0,
      });
    }

    // List all available templates
    const templates = getAvailableTemplates();

    // Get download counts from DB
    const dbTemplates = await prisma.excelTemplate.findMany({
      where: { isActive: true },
      select: { type: true, downloadCount: true },
    });

    const downloadCounts: Record<string, number> = {};
    for (const t of dbTemplates) {
      downloadCounts[t.type] = t.downloadCount;
    }

    return NextResponse.json({
      templates: templates.map((t) => ({
        ...t,
        downloadCount: downloadCounts[t.type] || 0,
      })),
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/excel/templates' });
    return NextResponse.json(
      { error: "Failed to get templates" },
      { status: 500 }
    );
  }
});

// Get available template types
function getAvailableTemplates(): {
  type: string;
  name: string;
  description: string;
  icon: string;
}[] {
  return [
    {
      type: "parts",
      name: "Parts Import Template",
      description: "Import parts with numbers, categories, costs, and stock levels",
      icon: "Package",
    },
    {
      type: "suppliers",
      name: "Suppliers Import Template",
      description: "Import suppliers with contact info, lead times, and ratings",
      icon: "Truck",
    },
    {
      type: "products",
      name: "Products Import Template",
      description: "Import products with SKUs, prices, and assembly times",
      icon: "Box",
    },
    {
      type: "customers",
      name: "Customers Import Template",
      description: "Import customers with contact info and credit limits",
      icon: "Users",
    },
    {
      type: "inventory",
      name: "Inventory Import Template",
      description: "Import inventory levels with warehouse and lot info",
      icon: "Warehouse",
    },
    {
      type: "bom",
      name: "BOM Import Template",
      description: "Import bill of materials with product and component mappings",
      icon: "Layers",
    },
  ];
}

// Get display name for template type
function getTemplateDisplayName(type: string): string {
  const names: Record<string, string> = {
    parts: "Parts Import Template",
    suppliers: "Suppliers Import Template",
    products: "Products Import Template",
    customers: "Customers Import Template",
    inventory: "Inventory Import Template",
    bom: "BOM Import Template",
  };
  return names[type] || `${type} Import Template`;
}

// Get description for template type
function getTemplateDescription(type: string): string {
  const descriptions: Record<string, string> = {
    parts:
      "Use this template to import parts data including part numbers, names, categories, unit costs, and stock levels.",
    suppliers:
      "Use this template to import supplier data including codes, names, contact information, and lead times.",
    products:
      "Use this template to import product data including SKUs, names, prices, and assembly hours.",
    customers:
      "Use this template to import customer data including codes, names, contact information, and credit limits.",
    inventory:
      "Use this template to import inventory levels including part numbers, warehouses, quantities, and lot numbers.",
    bom:
      "Use this template to import bill of materials data including product SKUs, component part numbers, and quantities.",
  };
  return descriptions[type] || `Import template for ${type}`;
}
