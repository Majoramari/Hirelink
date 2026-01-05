/**
 * Employer validation schemas.
 *
 * Defines Zod schemas for validating employer profile payloads.
 *
 * References:
 * - Zod: https://zod.dev/
 */

import { z } from "zod";

/**
 * Zod schema for updating an employer profile.
 */
export const employerProfileSchema = z.preprocess(
	(input) => {
		if (!input || typeof input !== "object" || Array.isArray(input)) {
			return input;
		}

		const data = { ...input };

		if ("companyWebsite" in data && !("website" in data)) {
			data.website = data.companyWebsite;
		}
		if ("companyLocation" in data && !("location" in data)) {
			data.location = data.companyLocation;
		}

		delete data.companyWebsite;
		delete data.companyLocation;

		return data;
	},
	z
		.object({
			companyName: z
				.string()
				.min(1)
				.optional()
				.describe("The name of the company"),
			website: z
				.url({ message: "invalid website URL" })
				.optional()
				.describe("The website of the company"),
			description: z
				.string()
				.max(1000, { message: "description must be at most 1000 characters" })
				.optional()
				.describe("The description of the company"),
			location: z.string().optional().describe("The location of the company"),
		})
		.strict(),
);
