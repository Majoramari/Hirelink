/**
 * Job and application validation schemas.
 *
 * Defines Zod schemas for validating job creation/update and application
 * request bodies.
 *
 * References:
 * - Zod: https://zod.dev/
 */

import { z } from "zod";

/**
 * Zod schema for jobType.
 */
const jobTypeSchema = z
	.enum(["FULL_TIME", "PART_TIME", "INTERNSHIP"], {
		errorMap: () => ({ message: "invalid jobType" }),
	})
	.describe("The type of the job");

/**
 * Zod schema for experienceLevel.
 */
const experienceLevelSchema = z
	.enum(["FRESH", "JUNIOR", "SENIOR", "LEAD"], {
		errorMap: () => ({ message: "invalid experienceLevel" }),
	})
	.describe("The level of experience required for the job");

/**
 * Zod schema for required skill.
 */
const jobSkillSchema = z
	.object({
		skillId: z.string().min(1),
		required: z.boolean().optional(),
	})
	.strict()
	.describe("A required skill for the job");

/**
 * Zod schema for required language.
 */
const jobLanguageSchema = z
	.object({
		languageId: z.string().min(1),
		minimumProficiency: z.enum(["BASIC", "INTERMEDIATE", "ADVANCED", "NATIVE"]),
		required: z.boolean().optional(),
	})
	.strict()
	.describe("A required language for the job");

/**
 * Zod schema for creating a job.
 */
export const createJobSchema = z
	.object({
		title: z.string().min(1),
		description: z.string().min(1),
		responsibilities: z.array(z.string().min(1)).optional(),
		location: z.string().optional(),
		jobType: jobTypeSchema,
		experienceLevel: experienceLevelSchema,
		hoursPerWeek: z.number().int().positive().optional(),
		salary: z.number().int().positive().optional(),
		requiredSkills: z.array(jobSkillSchema).optional(),
		requiredLanguages: z.array(jobLanguageSchema).optional(),
	})
	.strict();

/**
 * Zod schema for updating a job.
 *
 * Optional fields have default value of undefined.
 */
export const updateJobSchema = z
	.object({
		title: z.string().min(1).optional().describe("The title of the job"),
		description: z
			.string()
			.min(1)
			.optional()
			.describe("The description of the job"),
		responsibilities: z
			.array(z.string().min(1))
			.optional()
			.describe("The responsibilities of the job"),
		location: z.string().optional().describe("The location of the job"),
		jobType: jobTypeSchema.optional().describe("The type of the job"),
		experienceLevel: experienceLevelSchema
			.optional()
			.describe("The level of experience required for the job"),
		hoursPerWeek: z
			.number()
			.int()
			.positive()
			.optional()
			.describe("The number of hours per week the job requires"),
		salary: z
			.number()
			.int()
			.positive()
			.optional()
			.describe("The salary of the job"),
		requiredSkills: z
			.array(jobSkillSchema)
			.optional()
			.describe("The required skills for the job"),
		requiredLanguages: z
			.array(jobLanguageSchema)
			.optional()
			.describe("The required languages for the job"),
	})
	.strict();

/**
 * Zod schema for submitting an application to a job.
 */
export const applyToJobSchema = z
	.object({
		coverLetter: z
			.string()
			.min(1)
			.optional()
			.describe("A cover letter submitted with the application"),
		resumeUrl: z
			.url()
			.optional()
			.describe("A URL to the applicant's resume"),
	})
	.strict();

/**
 * Zod schema for updating an application status.
 */
export const updateApplicationStatusSchema = z
	.object({
		status: z
			.enum(["APPLIED", "REJECTED", "HIRED"], {
				errorMap: () => ({ message: "invalid status" }),
			})
			.describe("The new status for the application"),
	})
	.strict();
