/*
  Warnings:

  - A unique constraint covering the columns `[normalizedName]` on the table `Language` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[normalizedName]` on the table `Skill` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Language" ADD COLUMN     "normalizedName" TEXT;

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "normalizedName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Language_normalizedName_key" ON "Language"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_normalizedName_key" ON "Skill"("normalizedName");
