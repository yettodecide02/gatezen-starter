-- CreateEnum
CREATE TYPE "public"."PackageStatus" AS ENUM ('PENDING', 'PICKED');

-- CreateTable
CREATE TABLE "public"."Packages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "status" "public"."PackageStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Packages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Packages" ADD CONSTRAINT "Packages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Packages" ADD CONSTRAINT "Packages_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
