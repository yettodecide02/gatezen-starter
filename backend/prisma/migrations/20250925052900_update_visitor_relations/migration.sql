-- CreateEnum
CREATE TYPE "public"."VisitorType" AS ENUM ('GUEST', 'DELIVERY', 'CAB_AUTO');

-- CreateEnum
CREATE TYPE "public"."VisitorStatus" AS ENUM ('PENDING', 'APPROVED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."Visitor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "type" "public"."VisitorType" NOT NULL,
    "expectedAt" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT,
    "vehicle" TEXT,
    "notes" TEXT,
    "status" "public"."VisitorStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "residentId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Visitor_communityId_expectedAt_idx" ON "public"."Visitor"("communityId", "expectedAt");

-- AddForeignKey
ALTER TABLE "public"."Visitor" ADD CONSTRAINT "Visitor_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Visitor" ADD CONSTRAINT "Visitor_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
