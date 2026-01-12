/**
 * Base application error used by the API.
 *
 * Carries an HTTP status code and optional details payload.
 *
 * Notes:
 * - Throw `ApiError` (or subclasses) in services/middleware to trigger standardized
 *   responses via the global error handler.
 * - Avoid throwing raw errors for expected client failures (validation, auth, and similar cases).
 *
 * References:
 * - Express error handling: https://expressjs.com/en/guide/error-handling.html
 */
export default class ApiError extends Error {
	/**
	 * @param {number} [statusCode=500]
	 * @param {string} [message="internal server error"]
	 * @param {unknown} [details=null]
	 */
	constructor(
		statusCode = 500,
		message = "internal server error",
		details = null,
	) {
		super(message);
		this.statusCode = statusCode;
		this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
		this.details = details;
	}
}
