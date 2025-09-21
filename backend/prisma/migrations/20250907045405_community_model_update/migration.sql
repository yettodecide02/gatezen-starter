/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `communityId` on the `Facility` table. All the data in the column will be lost.
  - You are about to drop the column `configurationId` on the `Facility` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Facility` table. All the data in the column will be lost.
  - You are about to drop the column `facilityType` on the `Facility` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Facility` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Community` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `status` on the `Payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "public"."Facility" DROP CONSTRAINT "Facility_communityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Facility" DROP CONSTRAINT "Facility_configurationId_fkey";

-- AlterTable
ALTER TABLE "public"."Booking" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "public"."Facility" DROP COLUMN "communityId",
DROP COLUMN "configurationId",
DROP COLUMN "createdAt",
DROP COLUMN "facilityType",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "public"."Payments" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Community_name_key" ON "public"."Community"("name");
