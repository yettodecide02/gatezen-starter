-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_facilityId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
