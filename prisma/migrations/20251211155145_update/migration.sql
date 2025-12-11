/*
  Warnings:

  - You are about to drop the column `logoUrl` on the `Employer` table. All the data in the column will be lost.
  - You are about to drop the column `avatarUrl` on the `Talent` table. All the data in the column will be lost.
  - You are about to drop the column `resumeUrl` on the `Talent` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Employer" DROP COLUMN "logoUrl",
ADD COLUMN     "avatarPublicId" TEXT;

-- AlterTable
ALTER TABLE "public"."Talent" DROP COLUMN "avatarUrl",
DROP COLUMN "resumeUrl",
ADD COLUMN     "avatarPublicId" TEXT,
ADD COLUMN     "resumePublicId" TEXT;
