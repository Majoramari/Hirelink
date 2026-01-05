/**
 * Moderation validation schemas.
 *
 * Defines Zod schemas for moderator actions.
 *
 * References:
 * - Zod: https://zod.dev/
 */

import { z } from "zod";

/**
 * Zod schema for updating a user's active status.
 */
export const setUserActiveSchema = z
	.object({
		isActive: z
			.boolean()
			.describe("Whether to set the user's account to active or inactive"),
	})
	.strict();
