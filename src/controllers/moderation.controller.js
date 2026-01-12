/**
 * Moderation controller.
 *
 * Defines moderator-only route handlers that turn moderation.service results
 * into standard API responses.
 *
 * Notes:
 * - Moderation endpoints must always be protected by `requireAuth` + `requireRole("MODERATOR")`.
 * - Business rules (for example, preventing moderator deactivation) live in the service.
 *
 * References:
 * - OWASP Access Control: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
 */

import {moderationService} from "../services/index.js";
import {fail, success} from "../utils/response.utils.js";

/**
 * Gets moderation system statistics.
 * @param {import("express").Request} _req
 * @param {import("express").Response} res
 */
export async function stats(_req, res) {
    const result = await moderationService.getStats();
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
 * Deletes a user by ID.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function deleteUser(req, res) {
    const result = await moderationService.deleteUser(req.params.userId);
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
 * Lists users with optional filters.
 *
 * Supported query params:
 * - limit (number)
 * - skip (number)
 * - role (string)
 * - isActive (boolean)
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function listUsers(req, res) {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const skip = req.query.skip ? Number(req.query.skip) : 0;
    const role = req.query.role ? String(req.query.role) : undefined;
    const isActive =
        req.query.isActive === undefined
            ? undefined
            : String(req.query.isActive).toLowerCase() === "true";

    const result = await moderationService.listUsers({
        role,
        isActive,
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
 * Activates/deactivates a user.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function setUserActive(req, res) {
    const payload = req.validated ?? req.body;
    const result = await moderationService.setUserActive(
        req.params.userId,
        payload.isActive,
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
 * Lists jobs (moderation view).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function listJobs(req, res) {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const skip = req.query.skip ? Number(req.query.skip) : 0;

    const result = await moderationService.listJobs({limit, skip});
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
 * Deletes a job by ID.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function deleteJob(req, res) {
    const result = await moderationService.deleteJob(req.params.jobId);
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
