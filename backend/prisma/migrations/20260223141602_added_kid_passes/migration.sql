-- CreateEnum
CREATE TYPE "public"."KidPassStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHECKED_IN', 'CHECKED_OUT');

-- CreateTable
CREATE TABLE "public"."KidPass" (
    "id" TEXT NOT NULL,
    "childName" TEXT NOT NULL,
    "childAge" INTEGER,
    "parentName" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "status" "public"."KidPassStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KidPass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KidPass_communityId_idx" ON "public"."KidPass"("communityId");

-- CreateIndex
CREATE INDEX "KidPass_communityId_validFrom_idx" ON "public"."KidPass"("communityId", "validFrom");

-- CreateIndex
CREATE INDEX "KidPass_userId_idx" ON "public"."KidPass"("userId");

-- CreateIndex
CREATE INDEX "KidPass_status_idx" ON "public"."KidPass"("status");

-- AddForeignKey
ALTER TABLE "public"."KidPass" ADD CONSTRAINT "KidPass_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KidPass" ADD CONSTRAINT "KidPass_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
