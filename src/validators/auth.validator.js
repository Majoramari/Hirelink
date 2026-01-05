/**
 * Authentication validation schemas.
 *
 * Defines Zod schemas for auth endpoints such as register/login/verify/reset.
 *
 * Notes:
 * - Password requirements are enforced here (length, mixed characters, and similar rules).
 * - Try to keep these rules aligned with frontend validation for a better user experience.
 *
 * References:
 * - OWASP Password Guidance: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 * - Zod: https://zod.dev/
 */

import { z } from "zod";
import { talentProfileSchema } from "./talent.validator.js";

const emailSchema = z
	.email({
		message: "invalid email address",
	})
	.describe("The email address of the user");

const passwordSchema = z
	.string()
	.min(8, { message: "must be at least 8 characters" })
	.max(32, { message: "must be at most 32 characters" })
	.regex(/[A-Z]/, { message: "must include uppercase letters" })
	.regex(/[a-z]/, { message: "must include lowercase letters" })
	.regex(/[0-9]/, { message: "must include numbers" })
	.regex(/[^A-Za-z0-9]/, { message: "must include special characters" })
	.regex(/^(?!.*(.)\1\1).*$/, {
		message: "cannot contain three repeating characters",
	})
	.describe(
		"The password of the user. Must be at least 8 characters, with at least one uppercase letter, one lowercase letter, one number, and one special character. Cannot contain three repeating characters.",
	);

const roleSchema = z
	.enum(["TALENT", "EMPLOYER"], {
		errorMap: () => ({ message: "role must be either TALENT or EMPLOYER" }),
	})
	.describe("The role of the user");

const employerProfileSchema = z
	.object({
		companyName: z
			.string({ required_error: "companyName is required" })
			.min(1, { message: "companyName is required" })
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
		logoUrl: z
			.url({ message: "invalid logo URL" })
			.optional()
			.describe("The logo URL of the company"),
	})
	.strict();

/**
 * Zod schema for user registration.
 */
export const registerSchema = z
	.object({
		email: emailSchema,
		password: passwordSchema,
		role: roleSchema,
		profileData: z.unknown(),
	})
	.superRefine((data, ctx) => {
		// Check that profileData exists
		if (!data.profileData || typeof data.profileData !== "object") {
			ctx.addIssue({
				code: "invalid_type",
				expected: "object",
				received: typeof data.profileData,
				path: ["profileData"],
				message: "profile data is required",
			});
			return;
		}
		// Validate profileData based on the role
		if (data.role === "TALENT") {
			const result = talentProfileSchema.safeParse(data.profileData);
			if (!result.success) {
				result.error.issues.forEach((issue) => {
					ctx.addIssue({
						...issue,
						path: ["profileData", ...issue.path],
					});
				});
			}
		} else if (data.role === "EMPLOYER") {
			const result = employerProfileSchema.safeParse(data.profileData);
			if (!result.success) {
				result.error.issues.forEach((issue) => {
					ctx.addIssue({
						...issue,
						path: ["profileData", ...issue.path],
					});
				});
			}
		}
	})
	.describe("User registration schema");

/**
 * Zod schema for email verification.
 */
export const verifyEmailSchema = z.object({
	verificationToken: z
		.string({ required_error: "required" })
		.min(1, { message: "cannot be empty" })
		.length(64, { message: "invalid format" })
		.describe("The verification token sent to the user's email"),
});

/**
 * Zod schema for login.
 */
export const loginSchema = z.object({
	email: emailSchema,
	password: z
		.string({ required_error: "required" })
		.min(1, { message: "required" })
		.max(32, { message: "must be at most 64 characters" })
		.describe("The password of the user"),
});

/**
 * Zod schema for requesting a password reset email.
 */
export const requestPasswordResetSchema = z.object({
	email: z
		.email("invalid email format")
		.describe("The email address of the user"),
});

/**
 * Zod schema for resetting a password using a reset token.
 */
export const resetPasswordSchema = z.object({
	verificationToken: z
		.string()
		.min(1, "verification token is required")
		.describe("The verification token sent to the user's email"),
	newPassword: z
		.string()
		.min(8, "password must be at least 8 characters")
		.min(8, { message: "must be at least 8 characters" })
		.max(32, { message: "must be at most 32 characters" })
		.regex(/[A-Z]/, { message: "must include uppercase letters" })
		.regex(/[a-z]/, { message: "must include lowercase letters" })
		.regex(/[0-9]/, { message: "must include numbers" })
		.regex(/[^A-Za-z0-9]/, { message: "must include special characters" })
		.regex(/^(?!.*(.)\1\1).*$/, {
			message: "cannot contain three repeating characters",
		})
		.describe(
			"The new password of the user. Must be at least 8 characters, with at least one uppercase letter, one lowercase letter, one number, and one special character. Cannot contain three repeating characters.",
		),
	oldPassword: z.string().optional().describe("The old password of the user"),
});
