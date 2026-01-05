/**
 * Response helpers.
 *
 * Standardizes API responses across controllers.
 *
 * Notes:
 * - Controllers should use these helpers instead of calling `res.json(...)` directly.
 * - Service functions should return `result(...)` objects and let controllers map them to HTTP.
 * - Keeping a consistent response shape makes Bruno collections and end-to-end tests easier.
 *
 * References:
 * - Express Response API: https://expressjs.com/en/api.html#res
 */

import statusCodes from "./statusCodes.utils.js";

/**
 * Sends a successful API response.
 * @param {{
 *   res: import("express").Response,
 *   statusCode?: number,
 *   message?: string | null,
 *   data?: unknown
 * }} params Parameters.
 */
export function success({
	res,
	statusCode = statusCodes.OK,
	message = null,
	data = null,
}) {
	return res.status(statusCode).json({
		success: true,
		statusCode,
		message,
		data,
	});
}

/**
 * Sends a failed API response.
 * @param {{
 *   res: import("express").Response,
 *   statusCode?: number,
 *   message?: string,
 *   details?: unknown
 * }} params Parameters.
 */
export function fail({
	res,
	statusCode = statusCodes.INTERNAL_SERVER_ERROR,
	message = "internal server error",
	details = null,
}) {
	return res.status(statusCode).json({
		success: false,
		statusCode,
		message,
		details,
	});
}

/**
 * Creates a normalized service result object.
 * @param {{ ok?: boolean, statusCode: number, message: string, payload?: unknown }} params Parameters.
 */
export function result({ ok = false, statusCode, message, payload = null }) {
	return {
		ok,
		statusCode,
		message,
		payload,
	};
}
