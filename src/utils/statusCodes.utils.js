/**
 * HTTP status code constants.
 *
 * Reference:
 * - MDN HTTP status codes: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
 */

const STATUS_CODES = {
	OK: 200,
	CREATED: 201,
	ACCEPTED: 202,
	NO_CONTENT: 204,

	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	TOO_MANY_REQUESTS: 429,

	INTERNAL_SERVER_ERROR: 500,
	BAD_GATEWAY: 502,
	GATEWAY_TIMEOUT: 504,
};

export default STATUS_CODES;
