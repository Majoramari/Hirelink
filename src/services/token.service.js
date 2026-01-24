/**
 * Token service.
 *
 * Provides helpers for JSON Web Token (JWT) access and refresh tokens and refresh token rotation.
 *
 * Main behavior:
 * - refresh tokens are stored as SHA-256 hashes in the database
 * - rotation revokes the old token and links it to the new one
 * - if reuse/replay is detected, all user tokens are revoked and a security
 *   email is sent
 *
 * Security notes:
 * - Access tokens are short-lived and used for API authorization.
 * - Refresh tokens are long-lived and must be stored and rotated carefully.
 * - Because refresh tokens are hashed, the database cannot be used to create valid tokens.
 *
 * References:
 * - RFC 7519 (JWT): https://datatracker.ietf.org/doc/html/rfc7519
 * - OWASP JWT Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html
 */

import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import { ApiError } from "../errors/index.js";
import logger from "../lib/logger.js";
import prisma from "../lib/prisma.js";
import {
	generateToken,
	generateUlid,
	parseExpiry,
} from "../utils/general.utils.js";
import { result } from "../utils/response.utils.js";
import statusCodes from "../utils/statusCodes.utils.js";
import * as emailService from "./email.service.js";

/**
 * Hashes a refresh token for storage/lookup.
 * @param {string} token
 */
function hashRefreshToken(token) {
	return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generates a signed JWT access token.
 * @param {string} userId
 */
export function generateAccessToken(userId) {
	return jwt.sign({ id: userId, jti: generateUlid() }, env.JWT_ACCESS_SECRET, {
		expiresIn: env.JWT_ACCESS_EXPIRY,
	});
}

/**
 * Generates a signed JWT refresh token.
 * @param {string} userId
 */
export function generateRefreshToken(userId) {
	return jwt.sign({ id: userId, jti: generateUlid() }, env.JWT_REFRESH_SECRET, {
		expiresIn: env.JWT_REFRESH_EXPIRY,
	});
}

/**
 * Verifies a JWT access token.
 * @param {string} token
 * @returns {Promise<null | object>}
 */
export async function verifyAccessToken(token) {
	try {
		return jwt.verify(token, env.JWT_ACCESS_SECRET);
	} catch (_err) {
		return null;
	}
}

/**
 * Verifies a JWT refresh token.
 * @param {string} token
 * @returns {Promise<null | object>}
 */
export async function verifyRefreshToken(token) {
	try {
		return jwt.verify(token, env.JWT_REFRESH_SECRET);
	} catch (_err) {
		return null;
	}
}

/**
 * Stores a refresh token in the database (hashed).
 * @param {string} token
 * @param {string} userId
 * @param {Date} [expiresAt]
 */
export async function store(token, userId, expiresAt) {
	const tokenHash = hashRefreshToken(token);
	return prisma.refreshToken.create({
		data: {
			id: generateUlid(),
			token: tokenHash,
			userId,
			expiresAt:
				expiresAt ?? new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRY)),
		},
	});
}

/**
 * Handles a suspected refresh-token compromise (replay/reuse):
 * - revokes all active refresh tokens
 * - issues a password reset token
 * - sends a security alert email
 * @param {string} userId
 */
async function handleCompromisedUser(userId) {
	try {
		// Create a reset token
		const resetToken = generateToken();

		// Update the user and revoke tokens in one transaction
		await prisma.$transaction(async (tx) => {
			// Save the reset token on the user
			await tx.user.update({
				where: { id: userId },
				data: {
					verificationToken: resetToken,
					verificationExpiresAt: new Date(
						Date.now() + parseExpiry(env.EMAIL_VERIFICATION_EXPIRY),
					),
				},
			});

			// Revoke all active refresh tokens
			await tx.refreshToken.updateMany({
				where: { userId, revoked: false },
				data: {
					revoked: true,
					revokedAt: new Date(),
				},
			});
		});

		logger.warn(`User ${userId} compromised`);

		// Read the user email (outside the transaction to avoid locking)
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { email: true },
		});

		if (!user) {
			logger.error(`User ${userId} not found after token revocation`);
			return result({
				ok: false,
				statusCode: statusCodes.UNAUTHORIZED,
				message: "invalid token",
			});
		}

		// Send a security alert email (non-blocking)
		emailService
			.sendSecurityAlertEmail(
				user.email,
				`${env.FRONTEND_URL}/reset?vt=${resetToken}`,
				{ expiryMinutes: 5 },
			)
			.catch((err) => {
				logger.error("Failed to send security alert email:", err);
			});

		return result({
			ok: false,
			statusCode: statusCodes.UNAUTHORIZED,
			message: "invalid token",
		});
	} catch (error) {
		logger.error("Failed to handle compromised user:", error);
		return result({
			ok: false,
			statusCode: statusCodes.INTERNAL_SERVER_ERROR,
			message: "authentication failed",
		});
	}
}

/**
 * Rotates a refresh token.
 *
 * If token reuse/replay is detected, revokes all tokens and returns an
 * unauthorized result.
 * @param {string} incomingToken
 */
export async function rotateRefreshToken(incomingToken) {
	try {
		const decoded = await verifyRefreshToken(incomingToken);

		if (!decoded?.id) {
			throw new ApiError(statusCodes.UNAUTHORIZED, "invalid token");
		}

		const incomingHash = hashRefreshToken(incomingToken);

		// Check if this token exists in the database
		const existing = await prisma.refreshToken.findFirst({
			where: {
				OR: [{ token: incomingToken }, { token: incomingHash }],
			},
		});

		// Token reuse detected: the token may have been stolen
		if (!existing) {
			logger.warn(`Token reuse detected for user ${decoded.id}`);
			return await handleCompromisedUser(decoded.id);
		}

		// Token replay detected: a revoked token was used again
		if (existing.revoked) {
			logger.warn(`Token replay detected for user ${decoded.id}`);
			return await handleCompromisedUser(decoded.id);
		}

		// Check token expiry
		if (existing.expiresAt < new Date()) {
			logger.debug(`Expired token used by user ${decoded.id}`);
			return result({
				ok: false,
				statusCode: statusCodes.UNAUTHORIZED,
				message: "token expired",
			});
		}

		// Valid token: rotate it
		const newToken = generateRefreshToken(decoded.id);
		const newTokenId = generateUlid();
		const newTokenHash = hashRefreshToken(newToken);

		// Store the new token and revoke the old one in one transaction
		await prisma.$transaction(async (tx) => {
			await tx.refreshToken.create({
				data: {
					id: newTokenId,
					token: newTokenHash,
					userId: decoded.id,
					expiresAt: new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRY)),
				},
			});

			await tx.refreshToken.update({
				where: { token: existing.token },
				data: {
					revoked: true,
					revokedAt: new Date(),
					replacedById: newTokenId,
				},
			});
		});

		return result({
			ok: true,
			statusCode: statusCodes.OK,
			message: "token rotated",
			payload: {
				refreshToken: newToken,
				userId: decoded.id, // Include userId so the auth service can create an access token
			},
		});
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}
		logger.error("Token rotation failed:", error);
		throw new ApiError(
			statusCodes.INTERNAL_SERVER_ERROR,
			"token rotation failed",
		);
	}
}

/**
 * Revokes a single refresh token.
 * @param {string} token
 */
export async function revokeRefreshToken(token) {
	try {
		// Make sure the token is valid
		const decoded = await verifyRefreshToken(token);

		if (!decoded?.id) {
			return result({
				ok: false,
				statusCode: statusCodes.BAD_REQUEST,
				message: "invalid refresh token",
			});
		}

		const tokenHash = hashRefreshToken(token);

		// Find the token and revoke it
		const existing = await prisma.refreshToken.findFirst({
			where: {
				OR: [{ token }, { token: tokenHash }],
			},
		});

		if (!existing) {
			// Token is not in the database; it may already be deleted
			return result({
				ok: true,
				statusCode: statusCodes.OK,
				message: "logged out successfully",
			});
		}

		if (existing.revoked) {
			// Token is already revoked
			return result({
				ok: true,
				statusCode: statusCodes.OK,
				message: "logged out successfully",
			});
		}

		// Revoke the token
		await prisma.refreshToken.update({
			where: { token: existing.token },
			data: {
				revoked: true,
				revokedAt: new Date(),
			},
		});

		logger.debug(`User ${decoded.id} logged out`);

		return result({
			ok: true,
			statusCode: statusCodes.OK,
			message: "logged out successfully",
		});
	} catch (error) {
		logger.error("Logout failed:", error);
		// Even on error, we still want the client to clear the cookie, so return success
		return result({
			ok: true,
			statusCode: statusCodes.OK,
			message: "logged out successfully",
		});
	}
}

/**
 * Revokes all active refresh tokens for a user.
 * @param {string} userId
 */
export async function revokeAllRefreshTokens(userId) {
	try {
		const result = await prisma.refreshToken.updateMany({
			where: {
				userId,
				revoked: false,
			},
			data: {
				revoked: true,
				revokedAt: new Date(),
			},
		});

		logger.info(`Revoked ${result.count} tokens for user ${userId}`);

		return {
			ok: true,
			count: result.count,
		};
	} catch (error) {
		logger.error("Failed to revoke all tokens:", error);
		throw error;
	}
}
