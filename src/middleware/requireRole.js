/**
 * Authorization middleware.
 *
 * Provides role-based access control (RBAC) by checking `req.user.role`.
 *
 * Notes:
 * - This middleware assumes authentication already ran and set `req.user`.
 * - Use this to enforce route-level access (for example, only EMPLOYER can create jobs).
 *
 * References:
 * - OWASP Access Control: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
 */

import { fail } from "../utils/response.utils.js";
import statusCodes from "../utils/statusCodes.utils.js";

/**
 * Builds an Express middleware enforcing that the authenticated user has one
 * of the allowed roles.
 * @param {string|string[]} allowedRoles
 * @returns {(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void}
 */
export default function requireRole(allowedRoles) {
	const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

	return (req, res, next) => {
		if (!req.user?.role) {
			return fail({
				res,
				statusCode: statusCodes.UNAUTHORIZED,
				message: "unauthorized",
			});
		}

		if (!roles.includes(req.user.role)) {
			return fail({
				res,
				statusCode: statusCodes.FORBIDDEN,
				message: "forbidden",
			});
		}

		next();
	};
}
