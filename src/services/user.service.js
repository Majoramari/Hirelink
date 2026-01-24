/**
 * User lookup service.
 *
 * Provides helpers to find users by email or id.
 *
 * Note:
 * - It works with Talent & Employer
 *
 */

import { z } from "zod";
import prisma from "../lib/prisma.js";
import { result } from "../utils/response.utils.js";
import statusCodes from "../utils/statusCodes.utils.js";

/**
 * Finds a user by email or id.
 * @param {string} identifier
 * @returns {Promise<import("../generated/prisma/client.ts").User | null>}
 */
export async function findUser(identifier) {
	if (!identifier) {
		return null;
	}

	const baseSelect = {
		id: true,
		email: true,
		password: true,
		isActive: true,
		role: true,
		isEmailVerified: true,
		verificationToken: true,
		verificationExpiresAt: true,
		createdAt: true,
		updatedAt: true,
	};

	// If it looks like an email address
	if (z.email().safeParse(identifier).success) {
		return prisma.user.findUnique({
			where: { email: identifier },
			select: baseSelect,
		});
	}

	// Otherwise, treat it as an id
	const roleRow = await prisma.user.findUnique({
		where: { id: identifier },
		select: { role: true },
	});
	if (!roleRow) {
		return null;
	}

	return prisma.user.findUnique({
		where: { id: identifier },
		select: {
			...baseSelect,
			...(roleRow.role === "TALENT" ? { talentProfile: true } : {}),
			...(roleRow.role === "EMPLOYER" ? { employerProfile: true } : {}),
		},
	});
}

/**
 * Fetches a user by id including both role profiles.
 *
 * This is useful for logic that needs to validate profile invariants or
 * read/write fields on either profile.
 *
 * @param {string} userId
 * @returns {Promise<any | null>}
 */
export async function getUserWithProfiles(userId) {
	if (!userId) {
		return null;
	}

	return prisma.user.findUnique({
		where: { id: userId },
		include: { talentProfile: true, employerProfile: true },
	});
}

/**
 * Returns the role that is expected to own a given profile key.
 * @param {"talentProfile"|"employerProfile"} profileKey
 * @returns {"TALENT"|"EMPLOYER"|null}
 */
function getExpectedRoleForProfileKey(profileKey) {
	if (profileKey === "talentProfile") {
		return "TALENT";
	}
	if (profileKey === "employerProfile") {
		return "EMPLOYER";
	}
	return null;
}

/**
 * Validates that a user is configured correctly for the provided `profileKey`.
 *
 * Returns `null` if valid, otherwise returns a standardized `result(...)` error.
 *
 * @param {any} user
 * @param {"talentProfile"|"employerProfile"} profileKey
 * @returns {ReturnType<typeof result> | null}
 */
export function validateRoleProfileInvariant(user, profileKey) {
	const expectedRole = getExpectedRoleForProfileKey(profileKey);
	if (!expectedRole) {
		return result({
			ok: false,
			statusCode: statusCodes.BAD_REQUEST,
			message: "invalid profile key",
		});
	}

	if (user.role === "MODERATOR") {
		return result({
			ok: false,
			statusCode: statusCodes.FORBIDDEN,
			message: "moderators do not have profiles",
		});
	}

	if (user.role !== expectedRole) {
		return result({
			ok: false,
			statusCode: statusCodes.FORBIDDEN,
			message: "forbidden",
		});
	}

	if (expectedRole === "TALENT") {
		if (!user.talentProfile) {
			return result({
				ok: false,
				statusCode: statusCodes.NOT_FOUND,
				message: "talent profile not found",
			});
		}
		if (user.employerProfile) {
			return result({
				ok: false,
				statusCode: statusCodes.CONFLICT,
				message: "role/profile mismatch",
			});
		}
	}

	if (expectedRole === "EMPLOYER") {
		if (!user.employerProfile) {
			return result({
				ok: false,
				statusCode: statusCodes.NOT_FOUND,
				message: "employer profile not found",
			});
		}
		if (user.talentProfile) {
			return result({
				ok: false,
				statusCode: statusCodes.CONFLICT,
				message: "role/profile mismatch",
			});
		}
	}

	return null;
}

/**
 * Deletes a user account.
 *
 * Notes:
 * - Moderators cannot be deleted.
 * - Related records are handled by Prisma relation `onDelete` rules.
 *
 * @param {string} userId
 * @returns {Promise<ReturnType<typeof result>>}
 */
export async function deleteUser(userId) {
	const existing = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, role: true },
	});
	if (!existing) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "user not found",
		});
	}

	if (existing.role === "MODERATOR") {
		return result({
			ok: false,
			statusCode: statusCodes.FORBIDDEN,
			message: "moderator accounts cannot be deleted",
		});
	}

	await prisma.user.delete({ where: { id: userId } });
	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "user deleted",
		payload: null,
	});
}
