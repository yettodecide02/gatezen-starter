-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('RESIDENT', 'ADMIN', 'GATEKEEPER', 'STAFF');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."TicketStatus" AS ENUM ('SUBMITTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."VisitorType" AS ENUM ('GUEST', 'DELIVERY', 'CAB_AUTO');

-- CreateEnum
CREATE TYPE "public"."PriceType" AS ENUM ('PER_HOUR', 'PER_DAY', 'PER_WEEK', 'PER_MONTH', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "public"."FacilityType" AS ENUM ('SWIMMING_POOL', 'GYMNASIUM', 'TENNIS_COURT', 'BASKETBALL_COURT', 'PLAYGROUND', 'CLUBHOUSE', 'PARTY_HALL', 'CONFERENCE_ROOM', 'LIBRARY', 'GARDEN', 'JOGGING_TRACK');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."Community" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "noOfBlocks" INTEGER,
    "noOfUnits" INTEGER,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Block" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Unit" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'RESIDENT',
    "status" "public"."UserStatus" NOT NULL DEFAULT 'PENDING',
    "communityId" TEXT NOT NULL,
    "unitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Visitor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "vehicleNo" TEXT,
    "visitorType" "public"."VisitorType" NOT NULL DEFAULT 'GUEST',
    "visitDate" TIMESTAMP(3) NOT NULL,
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "userId" TEXT,
    "communityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ticket" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'SUBMITTED',
    "priority" "public"."TicketPriority" NOT NULL DEFAULT 'LOW',
    "userId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TicketHistory" (
    "id" TEXT NOT NULL,
    "status" "public"."TicketStatus" NOT NULL,
    "ticketId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "public"."Facility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "open" TEXT NOT NULL,
    "close" TEXT NOT NULL,
    "slotMins" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 10,
    "communityId" TEXT NOT NULL,
    "configurationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "facilityType" "public"."FacilityType" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Booking" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "userId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "peopleCount" INTEGER NOT NULL DEFAULT 1,
    "communityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Community_name_key" ON "public"."Community"("name");

-- CreateIndex
CREATE INDEX "Block_communityId_idx" ON "public"."Block"("communityId");

-- CreateIndex
CREATE INDEX "Block_communityId_name_idx" ON "public"."Block"("communityId", "name");

-- CreateIndex
CREATE INDEX "Unit_blockId_idx" ON "public"."Unit"("blockId");

-- CreateIndex
CREATE INDEX "Unit_communityId_idx" ON "public"."Unit"("communityId");

-- CreateIndex
CREATE INDEX "Unit_communityId_number_idx" ON "public"."Unit"("communityId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_communityId_idx" ON "public"."User"("communityId");

-- CreateIndex
CREATE INDEX "User_communityId_role_idx" ON "public"."User"("communityId", "role");

-- CreateIndex
CREATE INDEX "User_communityId_status_idx" ON "public"."User"("communityId", "status");

-- CreateIndex
CREATE INDEX "User_unitId_idx" ON "public"."User"("unitId");

-- CreateIndex
CREATE INDEX "Announcement_communityId_idx" ON "public"."Announcement"("communityId");

-- CreateIndex
CREATE INDEX "Announcement_communityId_createdAt_idx" ON "public"."Announcement"("communityId", "createdAt");

-- CreateIndex
CREATE INDEX "Visitor_communityId_idx" ON "public"."Visitor"("communityId");

-- CreateIndex
CREATE INDEX "Visitor_communityId_visitDate_idx" ON "public"."Visitor"("communityId", "visitDate");

-- CreateIndex
CREATE INDEX "Visitor_userId_idx" ON "public"."Visitor"("userId");

-- CreateIndex
CREATE INDEX "Visitor_contact_idx" ON "public"."Visitor"("contact");

-- CreateIndex
CREATE INDEX "Visitor_vehicleNo_idx" ON "public"."Visitor"("vehicleNo");

-- CreateIndex
CREATE INDEX "Ticket_communityId_idx" ON "public"."Ticket"("communityId");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "public"."Ticket"("userId");

-- CreateIndex
CREATE INDEX "Ticket_communityId_status_idx" ON "public"."Ticket"("communityId", "status");

-- CreateIndex
CREATE INDEX "Ticket_communityId_priority_idx" ON "public"."Ticket"("communityId", "priority");

-- CreateIndex
CREATE INDEX "Ticket_communityId_category_idx" ON "public"."Ticket"("communityId", "category");

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "public"."Ticket"("createdAt");

-- CreateIndex
CREATE INDEX "TicketHistory_ticketId_idx" ON "public"."TicketHistory"("ticketId");

-- CreateIndex
CREATE INDEX "TicketHistory_ticketId_changedAt_idx" ON "public"."TicketHistory"("ticketId", "changedAt");

-- CreateIndex
CREATE INDEX "Comment_ticketId_idx" ON "public"."Comment"("ticketId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "public"."Comment"("userId");

-- CreateIndex
CREATE INDEX "Comment_ticketId_createdAt_idx" ON "public"."Comment"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityConfiguration_communityId_facilityType_key" ON "public"."FacilityConfiguration"("communityId", "facilityType");

-- CreateIndex
CREATE INDEX "Facility_communityId_idx" ON "public"."Facility"("communityId");

-- CreateIndex
CREATE INDEX "Facility_communityId_facilityType_idx" ON "public"."Facility"("communityId", "facilityType");

-- CreateIndex
CREATE INDEX "Facility_configurationId_idx" ON "public"."Facility"("configurationId");

-- CreateIndex
CREATE INDEX "Booking_facilityId_startsAt_idx" ON "public"."Booking"("facilityId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_communityId_startsAt_idx" ON "public"."Booking"("communityId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "public"."Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_communityId_status_idx" ON "public"."Booking"("communityId", "status");

-- CreateIndex
CREATE INDEX "Booking_startsAt_endsAt_idx" ON "public"."Booking"("startsAt", "endsAt");

-- AddForeignKey
ALTER TABLE "public"."Block" ADD CONSTRAINT "Block_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Unit" ADD CONSTRAINT "Unit_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "public"."Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Unit" ADD CONSTRAINT "Unit_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "public"."Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Announcement" ADD CONSTRAINT "Announcement_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Visitor" ADD CONSTRAINT "Visitor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Visitor" ADD CONSTRAINT "Visitor_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketHistory" ADD CONSTRAINT "TicketHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacilityConfiguration" ADD CONSTRAINT "FacilityConfiguration_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Facility" ADD CONSTRAINT "Facility_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Facility" ADD CONSTRAINT "Facility_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "public"."FacilityConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
