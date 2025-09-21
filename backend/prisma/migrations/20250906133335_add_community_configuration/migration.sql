-- CreateEnum
CREATE TYPE "public"."FacilityType" AS ENUM ('SWIMMING_POOL', 'GYMNASIUM', 'TENNIS_COURT', 'BASKETBALL_COURT', 'PLAYGROUND', 'CLUBHOUSE', 'PARTY_HALL', 'CONFERENCE_ROOM', 'LIBRARY', 'GARDEN', 'JOGGING_TRACK');

-- CreateEnum
CREATE TYPE "public"."PriceType" AS ENUM ('PER_HOUR', 'PER_DAY', 'PER_WEEK', 'PER_MONTH', 'ONE_TIME');

-- CreateTable
CREATE TABLE "public"."Community" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacilityConfiguration" (
    "id" TEXT NOT NULL,
    "facilityType" "public"."FacilityType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "maxCapacity" INTEGER NOT NULL DEFAULT 10,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "price" DOUBLE PRECISION DEFAULT 0,
    "priceType" "public"."PriceType" DEFAULT 'PER_HOUR',
    "operatingHours" TEXT DEFAULT '09:00-21:00',
    "rules" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "communityId" TEXT NOT NULL,

    CONSTRAINT "FacilityConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FacilityConfiguration_communityId_facilityType_key" ON "public"."FacilityConfiguration"("communityId", "facilityType");

-- AddForeignKey
ALTER TABLE "public"."FacilityConfiguration" ADD CONSTRAINT "FacilityConfiguration_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
