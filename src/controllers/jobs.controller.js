/**
 * Jobs controller.
 *
 * Defines route handlers for:
 * - job feed for logged-in talent (recent / recommended)
 * - job details (requires login)
 * - employer job create/update/list/get/delete
 * - talent applying to a job
 *
 * Notes:
 * - Controllers should stay thin: only handle HTTP.
 * - The recommendation logic lives in `src/services/job.service.js`.
 *
 * References:
 * - Express: https://expressjs.com/
 */

import {applicationService, jobService} from "../services/index.js";
import {fail, success} from "../utils/response.utils.js";

/**
 * Lists public jobs.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function list(req, res) {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const skip = req.query.skip ? Number(req.query.skip) : 0;
    const mode = req.query.mode ? String(req.query.mode) : "recent";
    const result = await jobService.listTalentJobs({
        userId: req.user.id,
        mode,
        limit,
        skip,
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
 * Creates a job for the authenticated employer.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function createEmployerJob(req, res) {
    const payload = req.validated ?? req.body;
    const result = await jobService.createEmployerJob(req.user.id, payload);
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
 * Lists jobs for the authenticated employer.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function listEmployerJobs(req, res) {
    const result = await jobService.listEmployerJobs(req.user.id);
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
 * Gets a job owned by the authenticated employer.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function getEmployerJob(req, res) {
    const result = await jobService.getEmployerJob(req.user.id, req.params.jobId);
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
 * Updates a job owned by the authenticated employer.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function updateEmployerJob(req, res) {
    const payload = req.validated ?? req.body;
    const result = await jobService.updateEmployerJob(
        req.user.id,
        req.params.jobId,
        payload,
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
 * Deletes a job owned by the authenticated employer.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function deleteEmployerJob(req, res) {
    const result = await jobService.deleteEmployerJob(
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
 * Gets a public job.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function get(req, res) {
    const result = await jobService.getPublicJob(req.params.jobId);

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
 * Applies to a job as a talent.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function apply(req, res) {
    const payload = req.validated ?? req.body;
    const result = await applicationService.applyToJob(
        req.user.id,
        req.params.jobId,
        payload,
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
