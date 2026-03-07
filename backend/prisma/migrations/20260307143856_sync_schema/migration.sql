/*
  Warnings:

  - You are about to drop the column `dueDate` on the `HomePlannerTask` table. All the data in the column will be lost.
  - The `status` column on the `HomePlannerTask` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `endTime` on the `Meeting` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `Meeting` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Meeting` table. All the data in the column will be lost.
  - You are about to drop the column `vehicles` on the `User` table. All the data in the column will be lost.
  - Added the required column `type` to the `HomePlannerTask` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduledAt` to the `Meeting` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `response` on the `MeetingRsvp` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SpotType" AS ENUM ('TWO_WHEELER', 'FOUR_WHEELER', 'EV');

-- CreateEnum
CREATE TYPE "ParkingBookingStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RsvpResponse" AS ENUM ('GOING', 'NOT_GOING', 'MAYBE');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('MAINTENANCE', 'CONTRACTOR', 'SERVICE', 'CLEANING', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'RESOLVED');

-- DropIndex
DROP INDEX "HomePlannerTask_userId_status_idx";

-- DropIndex
DROP INDEX "Meeting_communityId_startTime_idx";

-- AlterTable
ALTER TABLE "HomePlannerTask" DROP COLUMN "dueDate",
ADD COLUMN     "scheduledDate" TIMESTAMP(3),
ADD COLUMN     "type" "TaskType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "TaskStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Meeting" DROP COLUMN "endTime",
DROP COLUMN "startTime",
DROP COLUMN "status",
ADD COLUMN     "agenda" TEXT[],
ADD COLUMN     "scheduledAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "MeetingRsvp" DROP COLUMN "response",
ADD COLUMN     "response" "RsvpResponse" NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "vehicles";

-- DropEnum
DROP TYPE "HomePlannerTaskStatus";

-- DropEnum
DROP TYPE "MeetingRsvpResponse";

-- DropEnum
DROP TYPE "MeetingStatus";

-- CreateTable
CREATE TABLE "ParkingSpot" (
    "id" TEXT NOT NULL,
    "spotNumber" TEXT NOT NULL,
    "spotType" "SpotType" NOT NULL,
    "floor" TEXT,
    "block" TEXT,
    "pricePerDay" DOUBLE PRECISION NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "communityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkingSpot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkingBooking" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "status" "ParkingBookingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkingBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitNumber" TEXT,
    "blockName" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParkingSpot_communityId_idx" ON "ParkingSpot"("communityId");

-- CreateIndex
CREATE INDEX "ParkingSpot_communityId_isAvailable_idx" ON "ParkingSpot"("communityId", "isAvailable");

-- CreateIndex
CREATE INDEX "ParkingBooking_communityId_idx" ON "ParkingBooking"("communityId");

-- CreateIndex
CREATE INDEX "ParkingBooking_userId_idx" ON "ParkingBooking"("userId");

-- CreateIndex
CREATE INDEX "ParkingBooking_spotId_idx" ON "ParkingBooking"("spotId");

-- CreateIndex
CREATE INDEX "EmergencyAlert_userId_idx" ON "EmergencyAlert"("userId");

-- CreateIndex
CREATE INDEX "EmergencyAlert_communityId_idx" ON "EmergencyAlert"("communityId");

-- CreateIndex
CREATE INDEX "EmergencyAlert_communityId_status_idx" ON "EmergencyAlert"("communityId", "status");

-- CreateIndex
CREATE INDEX "HomePlannerTask_userId_communityId_idx" ON "HomePlannerTask"("userId", "communityId");

-- CreateIndex
CREATE INDEX "Meeting_communityId_scheduledAt_idx" ON "Meeting"("communityId", "scheduledAt");

-- AddForeignKey
ALTER TABLE "ParkingSpot" ADD CONSTRAINT "ParkingSpot_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingBooking" ADD CONSTRAINT "ParkingBooking_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "ParkingSpot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingBooking" ADD CONSTRAINT "ParkingBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingBooking" ADD CONSTRAINT "ParkingBooking_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyAlert" ADD CONSTRAINT "EmergencyAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyAlert" ADD CONSTRAINT "EmergencyAlert_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
