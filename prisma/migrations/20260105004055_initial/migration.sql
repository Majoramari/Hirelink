-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TALENT', 'EMPLOYER', 'MODERATOR');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('FRESH', 'JUNIOR', 'SENIOR', 'LEAD');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'REJECTED', 'HIRED');

-- CreateEnum
CREATE TYPE "LanguageProficiency" AS ENUM ('BASIC', 'INTERMEDIATE', 'ADVANCED', 'NATIVE');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'MASTER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "role" "Role" NOT NULL,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "verificationExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Talent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "headline" TEXT,
    "bio" VARCHAR(1000),
    "location" TEXT,
    "avatarPublicId" TEXT,
    "resumePublicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Talent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "website" TEXT,
    "description" VARCHAR(1000),
    "location" TEXT,
    "avatarPublicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location" TEXT,
    "jobType" "JobType" NOT NULL,
    "experienceLevel" "ExperienceLevel" NOT NULL,
    "hoursPerWeek" INTEGER,
    "salary" INTEGER,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSkill" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobLanguage" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "minimumProficiency" "LanguageProficiency" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "coverLetter" TEXT,
    "resumeUrl" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentSkill" (
    "id" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" "SkillLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalentSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Language" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentLanguage" (
    "id" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "proficiency" "LanguageProficiency" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalentLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentCertificate" (
    "id" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "credentialUrl" TEXT,
    "credentialId" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalentCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Talent_userId_key" ON "Talent"("userId");

-- CreateIndex
CREATE INDEX "Talent_userId_idx" ON "Talent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Employer_userId_key" ON "Employer"("userId");

-- CreateIndex
CREATE INDEX "Employer_userId_idx" ON "Employer"("userId");

-- CreateIndex
CREATE INDEX "Employer_companyName_idx" ON "Employer"("companyName");

-- CreateIndex
CREATE INDEX "Job_employerId_idx" ON "Job"("employerId");

-- CreateIndex
CREATE INDEX "Job_jobType_idx" ON "Job"("jobType");

-- CreateIndex
CREATE INDEX "Job_experienceLevel_idx" ON "Job"("experienceLevel");

-- CreateIndex
CREATE INDEX "JobSkill_skillId_idx" ON "JobSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "JobSkill_jobId_skillId_key" ON "JobSkill"("jobId", "skillId");

-- CreateIndex
CREATE INDEX "JobLanguage_languageId_idx" ON "JobLanguage"("languageId");

-- CreateIndex
CREATE UNIQUE INDEX "JobLanguage_jobId_languageId_key" ON "JobLanguage"("jobId", "languageId");

-- CreateIndex
CREATE INDEX "Application_talentId_idx" ON "Application"("talentId");

-- CreateIndex
CREATE INDEX "Application_jobId_idx" ON "Application"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_jobId_talentId_key" ON "Application"("jobId", "talentId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_normalizedName_key" ON "Skill"("normalizedName");

-- CreateIndex
CREATE INDEX "TalentSkill_skillId_idx" ON "TalentSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "TalentSkill_talentId_skillId_key" ON "TalentSkill"("talentId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "Language_name_key" ON "Language"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Language_normalizedName_key" ON "Language"("normalizedName");

-- CreateIndex
CREATE INDEX "TalentLanguage_languageId_idx" ON "TalentLanguage"("languageId");

-- CreateIndex
CREATE UNIQUE INDEX "TalentLanguage_talentId_languageId_key" ON "TalentLanguage"("talentId", "languageId");

-- CreateIndex
CREATE INDEX "TalentCertificate_talentId_idx" ON "TalentCertificate"("talentId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "RefreshToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Talent" ADD CONSTRAINT "Talent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employer" ADD CONSTRAINT "Employer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "Employer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSkill" ADD CONSTRAINT "JobSkill_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSkill" ADD CONSTRAINT "JobSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobLanguage" ADD CONSTRAINT "JobLanguage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobLanguage" ADD CONSTRAINT "JobLanguage_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentSkill" ADD CONSTRAINT "TalentSkill_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentSkill" ADD CONSTRAINT "TalentSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentLanguage" ADD CONSTRAINT "TalentLanguage_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentLanguage" ADD CONSTRAINT "TalentLanguage_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentCertificate" ADD CONSTRAINT "TalentCertificate_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
