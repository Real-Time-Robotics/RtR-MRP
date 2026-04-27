-- CreateEnum
CREATE TYPE "AssemblyOrderStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "assembly_orders" (
    "id" TEXT NOT NULL,
    "aoNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "bomHeaderId" TEXT NOT NULL,
    "targetQuantity" INTEGER NOT NULL DEFAULT 1,
    "status" "AssemblyOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "parentSerialId" TEXT,
    "assignedToUserId" TEXT,
    "createdByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assembly_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assembly_orders_aoNumber_key" ON "assembly_orders"("aoNumber");
CREATE UNIQUE INDEX "assembly_orders_parentSerialId_key" ON "assembly_orders"("parentSerialId");
CREATE INDEX "assembly_orders_productId_idx" ON "assembly_orders"("productId");
CREATE INDEX "assembly_orders_bomHeaderId_idx" ON "assembly_orders"("bomHeaderId");
CREATE INDEX "assembly_orders_status_idx" ON "assembly_orders"("status");
CREATE INDEX "assembly_orders_assignedToUserId_idx" ON "assembly_orders"("assignedToUserId");

-- AddForeignKey
ALTER TABLE "assembly_orders" ADD CONSTRAINT "assembly_orders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assembly_orders" ADD CONSTRAINT "assembly_orders_bomHeaderId_fkey" FOREIGN KEY ("bomHeaderId") REFERENCES "bom_headers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assembly_orders" ADD CONSTRAINT "assembly_orders_parentSerialId_fkey" FOREIGN KEY ("parentSerialId") REFERENCES "serial_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assembly_orders" ADD CONSTRAINT "assembly_orders_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assembly_orders" ADD CONSTRAINT "assembly_orders_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ConvertSerialLinkAssemblyOrderIdToFK
ALTER TABLE "serial_links" ADD CONSTRAINT "serial_links_assemblyOrderId_fkey" FOREIGN KEY ("assemblyOrderId") REFERENCES "assembly_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
