-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('UPCOMING', 'ONGOING', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MeetingRsvpResponse" AS ENUM ('ATTENDING', 'NOT_ATTENDING', 'MAYBE');

-- CreateEnum
CREATE TYPE "HomePlannerTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "status" "MeetingStatus" NOT NULL DEFAULT 'UPCOMING',
    "communityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingRsvp" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "response" "MeetingRsvpResponse" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingRsvp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomePlannerTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "HomePlannerTaskStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomePlannerTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Meeting_communityId_idx" ON "Meeting"("communityId");

-- CreateIndex
CREATE INDEX "Meeting_communityId_startTime_idx" ON "Meeting"("communityId", "startTime");

-- CreateIndex
CREATE INDEX "MeetingRsvp_meetingId_idx" ON "MeetingRsvp"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingRsvp_userId_idx" ON "MeetingRsvp"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingRsvp_meetingId_userId_key" ON "MeetingRsvp"("meetingId", "userId");

-- CreateIndex
CREATE INDEX "HomePlannerTask_userId_idx" ON "HomePlannerTask"("userId");

-- CreateIndex
CREATE INDEX "HomePlannerTask_communityId_idx" ON "HomePlannerTask"("communityId");

-- CreateIndex
CREATE INDEX "HomePlannerTask_userId_status_idx" ON "HomePlannerTask"("userId", "status");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRsvp" ADD CONSTRAINT "MeetingRsvp_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRsvp" ADD CONSTRAINT "MeetingRsvp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomePlannerTask" ADD CONSTRAINT "HomePlannerTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomePlannerTask" ADD CONSTRAINT "HomePlannerTask_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
