/**
 * Shared Cloudinary-backed profile file service.
 *
 * Encapsulates common logic for Talent and Employer profile file operations:
 * - storing the latest Cloudinary `public_id` in the role profile
 * - generating a fetchable URL
 * - deleting the Cloudinary asset and clearing the database reference
 *
 * Notes:
 * - The database stores the Cloudinary `public_id` instead of an external URL.
 * - URLs are generated when reading.
 * - Role/profile invariants are enforced: requests are rejected if the `profileKey` does not match
 *   the user's role or if the account is misconfigured.
 * - Resume functionality won't work until you enabled 'PDF and ZIP files delivery' in
 *   You can find in your Cloudinary settings at the security section.
 *
 * References:
 * - Cloudinary public IDs: https://cloudinary.com/documentation/image_upload_api_reference
 * - Cloudinary delivery URLs: https://cloudinary.com/documentation/image_transformations
 */

import {cloudinary} from "../config/cloudinary.js";
import logger from "../lib/logger.js";
import prisma from "../lib/prisma.js";
import errorUtils from "../utils/error.utils.js";
import {result} from "../utils/response.utils.js";
import statusCodes from "../utils/statusCodes.utils.js";
import {getUserWithProfiles, validateRoleProfileInvariant,} from "./user.service.js";

/**
 * Loads a user (including profiles) and validates the role↔profile invariant.
 *
 * @param {string} userId
 * @param {"talentProfile"|"employerProfile"} profileKey
 * @returns {Promise<{ user: any | null, error: ReturnType<typeof result> | null }>}
 */
async function guardUserAndProfile(userId, profileKey) {
	const user = await getUserWithProfiles(userId);
	if (!user) {
		return {
			user: null,
			error: result({
				ok: false,
				statusCode: statusCodes.NOT_FOUND,
				message: "user not found",
			}),
		};
	}

	const invariantError = validateRoleProfileInvariant(user, profileKey);
	if (invariantError) {
		return { user: null, error: invariantError };
	}

	return { user, error: null };
}

/**
 * Reads a stored Cloudinary public id field from the user's role profile.
 *
 * @param {any} user
 * @param {"talentProfile"|"employerProfile"} profileKey
 * @param {string} field
 * @returns {{ fileId: string | null, error: ReturnType<typeof result> | null }}
 */
function guardFileId(user, profileKey, field) {
	const fileId = user[profileKey]?.[field];
	if (!fileId) {
		return {
			fileId: null,
			error: result({
				ok: false,
				statusCode: statusCodes.NOT_FOUND,
				message: "file not found",
			}),
		};
	}
	return { fileId, error: null };
}

/**
 * Ensures the Cloudinary resource exists.
 *
 * Returns `null` if the resource exists, otherwise a standard not-found result.
 *
 * @param {string} fileId
 * @param {"image"|"raw"} resourceType
 * @returns {Promise<ReturnType<typeof result> | null>}
 */
async function guardCloudinaryResource(fileId, resourceType) {
	const [error] = await errorUtils(
		cloudinary.api.resource(fileId, { resource_type: resourceType }),
	);
	if (error) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "file not found",
		});
	}
	return null;
}

/**
 * Shared guard for profile file operations.
 *
 * Validates:
 * - user exists
 * - role/profile invariant
 * - stored file id exists
 * - Cloudinary resource exists
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {"talentProfile"|"employerProfile"} params.profileKey
 * @param {string} params.field
 * @param {"image"|"raw"} params.resourceType
 * @returns {Promise<{ fileId: string | null, error: ReturnType<typeof result> | null }>}
 */
async function guardProfileFileAccess({
	userId,
	profileKey,
	field,
	resourceType,
}) {
	const { user, error: guardError } = await guardUserAndProfile(
		userId,
		profileKey,
	);
	if (guardError) {
		return { fileId: null, error: guardError };
	}

	const { fileId, error: fileError } = guardFileId(user, profileKey, field);
	if (fileError) {
		return { fileId: null, error: fileError };
	}

	const cloudinaryError = await guardCloudinaryResource(fileId, resourceType);
	if (cloudinaryError) {
		return { fileId: null, error: cloudinaryError };
	}

	return { fileId, error: null };
}

/**
 * Updates a single Cloudinary-backed file reference on a role profile.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {"talentProfile"|"employerProfile"} params.profileKey
 * @param {string} params.field PublicId field name (for example, avatarPublicId)
 * @param {import("multer").File} params.file
 * @param {"image"|"raw"} params.resourceType
 */
export async function updateProfileFile({
	userId,
	profileKey,
	field,
	file,
	resourceType,
}) {
	try {
		const { user, error: guardError } = await guardUserAndProfile(
			userId,
			profileKey,
		);
		if (guardError) {
			return guardError;
		}

		const oldFileId = user[profileKey]?.[field];
		if (oldFileId) {
			await cloudinary.uploader.destroy(oldFileId, {
				resource_type: resourceType,
			});
		}

		const updated = await prisma.user.update({
			where: { id: userId },
			data: {
				[profileKey]: {
					update: {
						[field]: file.filename,
					},
				},
			},
			include: { [profileKey]: true },
		});

		return result({
			ok: true,
			statusCode: statusCodes.OK,
			message: "file updated",
			payload: updated,
		});
	} catch (err) {
		logger.error(err);
		return result({
			ok: false,
			statusCode: statusCodes.INTERNAL_SERVER_ERROR,
			message: "error updating file",
		});
	}
}

/**
 * Returns an accessible Cloudinary URL for a stored profile file.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {"talentProfile"|"employerProfile"} params.profileKey
 * @param {string} params.field
 * @param {"image"|"raw"} params.resourceType
 * @param {string} params.folder
 * @param {string} params.responseKey
 * @param {number} [params.width]
 * @param {number} [params.height]
 */
export async function getProfileFileUrl({
	userId,
	profileKey,
	field,
	resourceType,
	folder,
	responseKey,
	width,
	height,
}) {
	try {
		const { fileId, error: guardError } = await guardProfileFileAccess({
			userId,
			profileKey,
			field,
			resourceType,
		});
		if (guardError) {
			return guardError;
		}

		const url = cloudinary.url(fileId, {
			folder,
			resource_type: resourceType,
			...(resourceType === "image" && width && height
				? { width, height, crop: "fill" }
				: {}),
		});

		return result({
			ok: true,
			statusCode: statusCodes.OK,
			message: "file fetched",
			payload: { [responseKey]: url },
		});
	} catch (err) {
		logger.error(err);
		return result({
			ok: false,
			statusCode: statusCodes.INTERNAL_SERVER_ERROR,
			message: "error fetching file",
		});
	}
}

/**
 * Deletes a stored profile file from Cloudinary and clears the database reference.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {"talentProfile"|"employerProfile"} params.profileKey
 * @param {string} params.field
 * @param {"image"|"raw"} params.resourceType
 */
export async function deleteProfileFile({
	userId,
	profileKey,
	field,
	resourceType,
}) {
	try {
		const { fileId, error: guardError } = await guardProfileFileAccess({
			userId,
			profileKey,
			field,
			resourceType,
		});
		if (guardError) {
			return guardError;
		}

		await cloudinary.uploader.destroy(fileId, { resource_type: resourceType });
		await prisma.user.update({
			where: { id: userId },
			data: {
				[profileKey]: {
					update: {
						[field]: null,
					},
				},
			},
		});

		return result({
			ok: true,
			statusCode: statusCodes.OK,
			message: "file deleted",
		});
	} catch (err) {
		logger.error(err);
		return result({
			ok: false,
			statusCode: statusCodes.INTERNAL_SERVER_ERROR,
			message: "error deleting file",
		});
	}
}
