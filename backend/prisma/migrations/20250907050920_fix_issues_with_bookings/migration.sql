/*
  Warnings:

  - Added the required column `communityId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `communityId` to the `Facility` table without a default value. This is not possible if the table is not empty.
  - Added the required column `facilityType` to the `Facility` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Facility` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "communityId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Facility" ADD COLUMN     "communityId" TEXT NOT NULL,
ADD COLUMN     "configurationId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "facilityType" "public"."FacilityType" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Booking_communityId_startsAt_idx" ON "public"."Booking"("communityId", "startsAt");

-- AddForeignKey
ALTER TABLE "public"."Facility" ADD CONSTRAINT "Facility_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Facility" ADD CONSTRAINT "Facility_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "public"."FacilityConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
