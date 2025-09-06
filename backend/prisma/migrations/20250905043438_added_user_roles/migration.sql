-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'RESIDENT');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "role" "public"."UserRole" NOT NULL DEFAULT 'RESIDENT',
ADD COLUMN     "status" "public"."UserStatus" NOT NULL DEFAULT 'PENDING';
