-- CreateEnum
CREATE TYPE "ModuleDesignStatus" AS ENUM ('DEVELOPMENT', 'ACTIVE', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "BomSourceType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- AlterTable
ALTER TABLE "bom_lines" ADD COLUMN     "sourceType" "BomSourceType" NOT NULL DEFAULT 'INTERNAL';

-- AlterTable
ALTER TABLE "parts" ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_designs" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "productId" TEXT,
    "status" "ModuleDesignStatus" NOT NULL DEFAULT 'DEVELOPMENT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_designs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_code_key" ON "categories"("code");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE INDEX "categories_status_idx" ON "categories"("status");

-- CreateIndex
CREATE UNIQUE INDEX "module_designs_code_key" ON "module_designs"("code");

-- CreateIndex
CREATE INDEX "module_designs_status_idx" ON "module_designs"("status");

-- CreateIndex
CREATE INDEX "module_designs_productId_idx" ON "module_designs"("productId");

-- CreateIndex
CREATE INDEX "bom_lines_sourceType_idx" ON "bom_lines"("sourceType");

-- CreateIndex
CREATE INDEX "parts_categoryId_idx" ON "parts"("categoryId");

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
