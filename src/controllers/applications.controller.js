/**
 * Applications controller.
 *
 * Defines handlers for:
 * - listing applications for the authenticated talent
 * - listing applications for an employer's job
 * - updating application status (employer)
 *
 * Notes:
 * - Ownership checks happen in the service layer (talent versus employer scope).
 * - Controllers only return standard API responses.
 */

import { applicationService } from "../services/index.js";
import { fail, success } from "../utils/response.utils.js";

/**
 * Lists applications for the authenticated talent.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function list(req, res) {
	const result = await applicationService.listTalentApplications(req.user.id);
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
 * Lists applications for a job owned by the authenticated employer.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function listEmployerJobApplications(req, res) {
	const result = await applicationService.listEmployerJobApplications(
		req.user.id,
		req.params.jobId,
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
 * Updates an application status.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function updateStatus(req, res) {
	const payload = req.validated ?? req.body;
	const result = await applicationService.updateEmployerApplicationStatus(
		req.user.id,
		req.params.applicationId,
		payload.status,
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
