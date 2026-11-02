-- CreateEnum
CREATE TYPE "ResidentSubtype" AS ENUM ('OWNER', 'TENANT');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('OWNERSHIP', 'TENANT_HOUSEHOLD');

-- CreateEnum
CREATE TYPE "ResidentStatus" AS ENUM ('ACTIVE', 'PENDING', 'INACTIVE');

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "maxResidents" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "addedById" TEXT,
ADD COLUMN     "guardianId" TEXT,
ADD COLUMN     "isMinor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPrimaryContact" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leaseEndDate" TIMESTAMP(3),
ADD COLUMN     "leaseStartDate" TIMESTAMP(3),
ADD COLUMN     "residencyGroupId" TEXT,
ADD COLUMN     "residentStatus" "ResidentStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "residentSubtype" "ResidentSubtype";

-- CreateTable
CREATE TABLE "ResidencyGroup" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "groupType" "GroupType" NOT NULL,
    "name" TEXT,
    "primaryResidentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dissolvedAt" TIMESTAMP(3),

    CONSTRAINT "ResidencyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResidencyGroup_communityId_idx" ON "ResidencyGroup"("communityId");

-- CreateIndex
CREATE INDEX "ResidencyGroup_unitId_idx" ON "ResidencyGroup"("unitId");

-- CreateIndex
CREATE INDEX "ResidencyGroup_unitId_groupType_idx" ON "ResidencyGroup"("unitId", "groupType");

-- CreateIndex
CREATE INDEX "User_communityId_unitId_residentSubtype_residentStatus_idx" ON "User"("communityId", "unitId", "residentSubtype", "residentStatus");

-- CreateIndex
CREATE INDEX "User_residencyGroupId_idx" ON "User"("residencyGroupId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_residencyGroupId_fkey" FOREIGN KEY ("residencyGroupId") REFERENCES "ResidencyGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidencyGroup" ADD CONSTRAINT "ResidencyGroup_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidencyGroup" ADD CONSTRAINT "ResidencyGroup_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidencyGroup" ADD CONSTRAINT "ResidencyGroup_primaryResidentId_fkey" FOREIGN KEY ("primaryResidentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;