/**
 * Talent validation schemas.
 *
 * Defines Zod schemas for validating talent profile payloads.
 *
 * References:
 * - Zod: https://zod.dev/
 */

import { z } from "zod";

const skillLevelSchema = z.enum([
	"BEGINNER",
	"INTERMEDIATE",
	"ADVANCED",
	"EXPERT",
	"MASTER",
]);

const languageProficiencySchema = z.enum([
	"BASIC",
	"INTERMEDIATE",
	"ADVANCED",
	"NATIVE",
]);

const talentSkillIdentifierSchema = z
	.object({
		skillId: z.string().min(1).optional(),
		name: z.string().min(1).optional(),
	})
	.strict()
	.refine((v) => Boolean(v.skillId || v.name), {
		message: "skillId or name is required",
	});

const talentLanguageIdentifierSchema = z
	.object({
		languageId: z.string().min(1).optional(),
		name: z.string().min(1).optional(),
	})
	.strict()
	.refine((v) => Boolean(v.languageId || v.name), {
		message: "languageId or name is required",
	});

const talentCertificateIdentifierSchema = z
	.object({
		certificateId: z
			.string({ required_error: "certificateId is required" })
			.min(1, { message: "certificateId is required" }),
	})
	.strict();

/**
 * Zod schema for updating a talent profile.
 */
export const talentProfileSchema = z
	.object({
		firstName: z
			.string({ required_error: "firstName is required" })
			.min(2, { message: "firstName must be at least 2 characters" })
			.optional(),
		lastName: z
			.string({ required_error: "lastName is required" })
			.min(2, { message: "lastName must be at least 2 characters" })
			.optional(),
		headline: z.string().optional(),
		bio: z
			.string()
			.max(1000, { message: "bio must be at most 1000 characters" })
			.optional(),
		location: z.string().optional(),
	})
	.strict();

/**
 * Zod schema for updating a talent's skills.
 */
export const talentSkillsSchema = z
	.object({
		skills: z
			.array(
				z
					.object({
						name: z.string().min(1),
						level: skillLevelSchema.optional(),
					})
					.strict(),
			)
			.default([])
			.describe("An array of skills and their levels"),
	})
	.strict();

export const upsertTalentSkillSchema = z
	.object({
		skillId: z.string().min(1).optional(),
		name: z.string().min(1).optional(),
		level: skillLevelSchema.optional(),
	})
	.strict()
	.refine((v) => Boolean(v.skillId || v.name), {
		message: "skillId or name is required",
	});

export const removeTalentSkillSchema = talentSkillIdentifierSchema;

/**
 * Zod schema for updating a talent's languages.
 */
export const talentLanguagesSchema = z
	.object({
		languages: z
			.array(
				z
					.object({
						name: z.string().min(1),
						proficiency: languageProficiencySchema.optional(),
					})
					.strict(),
			)
			.default([])
			.describe("An array of languages and their proficiency levels"),
	})
	.strict();

export const upsertTalentLanguageSchema = z
	.object({
		languageId: z.string().min(1).optional(),
		name: z.string().min(1).optional(),
		proficiency: languageProficiencySchema.optional(),
	})
	.strict()
	.refine((v) => Boolean(v.languageId || v.name), {
		message: "languageId or name is required",
	});

export const removeTalentLanguageSchema = talentLanguageIdentifierSchema;

const certificatePayloadSchema = z
	.object({
		name: z
			.string({ required_error: "certificate name is required" })
			.min(1, { message: "certificate name is required" }),
		issuer: z
			.string({ required_error: "certificate issuer is required" })
			.min(1, { message: "certificate issuer is required" }),
		credentialUrl: z
			.string({ invalid_type_error: "credentialUrl must be a string" })
			.url({ message: "credentialUrl must be a valid url" })
			.optional(),
		credentialId: z
			.string({ invalid_type_error: "credentialId must be a string" })
			.min(1, { message: "credentialId cannot be empty" })
			.optional(),
		issueDate: z.coerce
			.date({ message: "issueDate must be a valid date" })
			.optional(),
		expiryDate: z.coerce
			.date({ message: "expiryDate must be a valid date" })
			.optional(),
	})
	.strict();

export const talentCertificatesSchema = z
	.object({
		certificates: z.array(certificatePayloadSchema).default([]),
	})
	.strict();

export const upsertTalentCertificateSchema = z
	.object({
		certificateId: z
			.string({ invalid_type_error: "certificateId must be a string" })
			.min(1, { message: "certificateId cannot be empty" })
			.optional(),
		name: z
			.string({ required_error: "certificate name is required" })
			.min(1, { message: "certificate name is required" }),
		issuer: z
			.string({ required_error: "certificate issuer is required" })
			.min(1, { message: "certificate issuer is required" }),
		credentialUrl: z
			.url({ message: "credentialUrl must be a valid url" })
			.optional(),
		credentialId: z
			.string({ invalid_type_error: "credentialId must be a string" })
			.min(1, { message: "credentialId cannot be empty" })
			.optional(),
		issueDate: z.coerce
			.date({ message: "issueDate must be a valid date" })
			.optional(),
		expiryDate: z.coerce
			.date({ message: "expiryDate must be a valid date" })
			.optional(),
	})
	.strict();

export const removeTalentCertificateSchema = talentCertificateIdentifierSchema;
