/**
 * Employer controller.
 *
 * Defines route handlers for authenticated employer profile updates and logo
 * management.
 *
 * Notes:
 * - Employer job create, list, update, and delete operations are handled in jobs controller/routes.
 * - File operations use Cloudinary via `profileFile.service`.
 *
 * - Cloudinary: https://cloudinary.com/documentation
 */

import { employerService } from "../services/index.js";
import { fail, success } from "../utils/response.utils.js";

/**
 * Updates the authenticated employer profile.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function updateProfile(req, res) {
	const result = await employerService.updateProfile(
		req.user.id,
		req.validated,
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
 * Uploads/updates employer logo.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function updateLogo(req, res) {
	const result = await employerService.updateLogo(req.user.id, req.file);
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
 * Fetches employer logo.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function getLogo(req, res) {
	const result = await employerService.getLogo(req.user.id, {
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
 * Deletes employer logo.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function deleteLogo(req, res) {
	const result = await employerService.deleteLogo(req.user.id);

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
