-- CreateEnum
CREATE TYPE "SerialStatus" AS ENUM ('IN_STOCK', 'ALLOCATED', 'CONSUMED', 'SHIPPED', 'SCRAPPED', 'RETURNED');

-- CreateEnum
CREATE TYPE "SerialSource" AS ENUM ('MANUFACTURED', 'RECEIVED', 'IMPORTED');

-- CreateTable
CREATE TABLE "serial_units" (
    "id" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "productId" TEXT,
    "moduleDesignId" TEXT,
    "partId" TEXT,
    "status" "SerialStatus" NOT NULL DEFAULT 'IN_STOCK',
    "source" "SerialSource" NOT NULL DEFAULT 'MANUFACTURED',
    "inventoryId" TEXT,
    "warehouseId" TEXT,
    "locationCode" TEXT,
    "createdByUserId" TEXT,
    "productionReceiptId" TEXT,
    "grnItemId" TEXT,
    "notes" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "serial_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serial_links" (
    "id" TEXT NOT NULL,
    "parentSerialId" TEXT NOT NULL,
    "childSerialId" TEXT NOT NULL,
    "bomLineId" TEXT,
    "assemblyOrderId" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedByUserId" TEXT,

    CONSTRAINT "serial_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serial_numbering_rules" (
    "id" TEXT NOT NULL,
    "moduleDesignId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "counterLastMMYY" INTEGER,
    "template" TEXT NOT NULL DEFAULT '{prefix}-{version}-{ddmmyy}-{###}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "serial_numbering_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "serial_units_serial_key" ON "serial_units"("serial");

-- CreateIndex
CREATE INDEX "serial_units_productId_idx" ON "serial_units"("productId");

-- CreateIndex
CREATE INDEX "serial_units_moduleDesignId_idx" ON "serial_units"("moduleDesignId");

-- CreateIndex
CREATE INDEX "serial_units_partId_idx" ON "serial_units"("partId");

-- CreateIndex
CREATE INDEX "serial_units_status_idx" ON "serial_units"("status");

-- CreateIndex
CREATE INDEX "serial_units_source_idx" ON "serial_units"("source");

-- CreateIndex
CREATE INDEX "serial_units_inventoryId_idx" ON "serial_units"("inventoryId");

-- CreateIndex
CREATE INDEX "serial_units_createdByUserId_idx" ON "serial_units"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "serial_links_childSerialId_key" ON "serial_links"("childSerialId");

-- CreateIndex
CREATE INDEX "serial_links_parentSerialId_idx" ON "serial_links"("parentSerialId");

-- CreateIndex
CREATE INDEX "serial_links_bomLineId_idx" ON "serial_links"("bomLineId");

-- CreateIndex
CREATE INDEX "serial_links_assemblyOrderId_idx" ON "serial_links"("assemblyOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "serial_numbering_rules_moduleDesignId_key" ON "serial_numbering_rules"("moduleDesignId");

-- AddForeignKey
ALTER TABLE "serial_units" ADD CONSTRAINT "serial_units_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_units" ADD CONSTRAINT "serial_units_moduleDesignId_fkey" FOREIGN KEY ("moduleDesignId") REFERENCES "module_designs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_units" ADD CONSTRAINT "serial_units_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_units" ADD CONSTRAINT "serial_units_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_units" ADD CONSTRAINT "serial_units_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_units" ADD CONSTRAINT "serial_units_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_units" ADD CONSTRAINT "serial_units_productionReceiptId_fkey" FOREIGN KEY ("productionReceiptId") REFERENCES "production_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_units" ADD CONSTRAINT "serial_units_grnItemId_fkey" FOREIGN KEY ("grnItemId") REFERENCES "grn_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_links" ADD CONSTRAINT "serial_links_parentSerialId_fkey" FOREIGN KEY ("parentSerialId") REFERENCES "serial_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_links" ADD CONSTRAINT "serial_links_childSerialId_fkey" FOREIGN KEY ("childSerialId") REFERENCES "serial_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_links" ADD CONSTRAINT "serial_links_bomLineId_fkey" FOREIGN KEY ("bomLineId") REFERENCES "bom_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_links" ADD CONSTRAINT "serial_links_linkedByUserId_fkey" FOREIGN KEY ("linkedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_numbering_rules" ADD CONSTRAINT "serial_numbering_rules_moduleDesignId_fkey" FOREIGN KEY ("moduleDesignId") REFERENCES "module_designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

