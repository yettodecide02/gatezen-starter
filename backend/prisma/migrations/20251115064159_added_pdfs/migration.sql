-- CreateTable
CREATE TABLE "public"."Pdfs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "communityId" TEXT NOT NULL,

    CONSTRAINT "Pdfs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Pdfs" ADD CONSTRAINT "Pdfs_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
