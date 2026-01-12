/**
 * Talent controller.
 *
 * Defines route handlers for authenticated talent profile updates and profile file
 * management (avatar/resume).
 *
 * Notes:
 * - Skill/language updates are validated with Zod schemas and normalized in the service layer.
 * - File operations use Cloudinary via `profileFile.service`.
 *
 * References:
 * - Cloudinary: https://cloudinary.com/documentation/node_integration
 */

import { talentService } from "../services/index.js";
import { fail, success } from "../utils/response.utils.js";

/**
 * Updates the authenticated talent profile.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function updateProfile(req, res) {
	const payload = req.validated ?? req.body;
	const result = await talentService.updateProfile(req.user.id, payload);
	if (!result.ok) {
		return fail({
			res,
			statusCode: result.statusCode,
			message: result.message,
			details: result.payload,
		});
	}

	return success({
		res,
		statusCode: result.statusCode,
		message: result.message,
		data: result.payload,
	});
}

export async function setSkills(req, res) {
	const result = await talentService.setSkills(
		req.user.id,
		req.validated.skills,
	);
	if (!result.ok) {
		return fail({
			res,
			statusCode: result.statusCode,
			message: result.message,
			details: result.payload,
		});
	}

	return success({
		res,
		statusCode: result.statusCode,
		message: result.message,
		data: result.payload,
	});
}

export async function setLanguages(req, res) {
	const result = await talentService.setLanguages(
		req.user.id,
		req.validated.languages,
	);
	if (!result.ok) {
		return fail({
			res,
			statusCode: result.statusCode,
			message: result.message,
			details: result.payload,
		});
	}

	return success({
		res,
		statusCode: result.statusCode,
		message: result.message,
		data: result.payload,
	});
}

/**
 * Uploads/updates a talent profile file (avatar/resume).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function updateFile(req, res) {
	const result = await talentService.updateFile(
		req.file.fieldname,
		req.user.id,
		req.file,
	);

	if (!result.ok) {
		return fail({
			res,
			statusCode: result.statusCode,
			message: result.message,
			details: result.payload,
		});
	}

	return success({
		res,
		statusCode: result.statusCode,
		message: result.message,
		data: result.payload,
	});
}

/**
 * Gets a talent profile file URL (avatar or resume).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function getFile(req, res) {
	const type = req.path.endsWith("/avatar") ? "avatar" : "resume";
	const result = await talentService.getFile(type, req.user.id, {
		width: req.query.width || 200,
		height: req.query.height || 200,
	});

	if (!result.ok) {
		return fail({
			res,
			statusCode: result.statusCode,
			message: result.message,
			details: result.payload,
		});
	}

	return success({
		res,
		statusCode: result.statusCode,
		message: result.message,
		data: result.payload,
	});
}

/**
 * Deletes a talent profile file (avatar or resume).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function deleteFile(req, res) {
	const type = req.path.endsWith("/avatar") ? "avatar" : "resume";
	const result = await talentService.deleteFile(type, req.user.id);

	if (!result.ok) {
		return fail({
			res,
			statusCode: result.statusCode,
			message: result.message,
			details: result.payload,
		});
	}

	return success({
		res,
		statusCode: result.statusCode,
		message: result.message,
		data: result.payload,
	});
}
