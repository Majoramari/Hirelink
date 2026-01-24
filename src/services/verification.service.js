/**
 * Verification token service.
 *
 * Generates and stores verification/reset tokens on the user record.
 *
 * Notes:
 * - Tokens are time-limited via `verificationExpiresAt`.
 * - This service only generates/stores tokens; email sending is handled elsewhere.
 *
 * References:
 * - OWASP Forgot Password Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
 */

import env from "../config/env.js";
import prisma from "../lib/prisma.js";
import { generateToken, parseExpiry } from "../utils/general.utils.js";

/**
 * Generates and stores a new verification token for a user.
 * @param {string} userId
 * @returns {Promise<string>} verification token
 */
export async function resendVerificationToken(userId) {
	const verificationToken = generateToken();

	// Create a new verification token
	await prisma.user.update({
		where: {
			id: userId,
		},
		data: {
			verificationToken,
			verificationExpiresAt: new Date(
				Date.now() + parseExpiry(env.EMAIL_VERIFICATION_EXPIRY),
			),
		},
	});

	return verificationToken;
}

/**
 * Generates and stores a password reset token for a user.
 * @param {string} userId
 * @returns {Promise<string>} reset token
 */
export async function generatePasswordResetToken(userId) {
	const resetToken = generateToken();

	await prisma.user.update({
		where: { id: userId },
		data: {
			verificationToken: resetToken,
			verificationExpiresAt: new Date(
				Date.now() + parseExpiry(env.EMAIL_VERIFICATION_EXPIRY),
			),
		},
	});

	return resetToken;
}
