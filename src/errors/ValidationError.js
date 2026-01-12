/**
 * Validation error.
 *
 * Specialized ApiError for request validation failures.
 *
 * Notes:
 * - Used by `validate` middleware when Zod parsing fails.
 * - The `details` payload is shaped for frontend/UI consumption (field errors).
 *
 * References:
 * - Zod: https://zod.dev/
 */

import ApiError from "./ApiError.js";

export default class ValidationError extends ApiError {
	/**
	 * @param {string} [message="invalid input"]
	 * @param {unknown} [details=null]
	 */
	constructor(message = "invalid input", details = null) {
		super(400, message, details);
	}
}
