// src/app/api/data-setup/status/route.ts
// Returns record counts for all master data entities

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";

export const GET = withAuth(async () => {
  const [
    warehouses,
    suppliers,
    customers,
    parts,
    products,
    partSuppliers,
    bom,
    inventory,
  ] = await Promise.all([
    prisma.warehouse.count(),
    prisma.supplier.count(),
    prisma.customer.count(),
    prisma.part.count(),
    prisma.product.count(),
    prisma.partSupplier.count(),
    prisma.bomHeader.count(),
    prisma.inventory.count(),
  ]);

  const response = NextResponse.json({
    warehouses,
    suppliers,
    customers,
    parts,
    products,
    partSuppliers,
    bom,
    inventory,
  });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
});
