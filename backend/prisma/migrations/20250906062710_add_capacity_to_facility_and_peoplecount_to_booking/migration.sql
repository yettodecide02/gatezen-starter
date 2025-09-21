-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "peopleCount" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "public"."Facility" ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 10;
