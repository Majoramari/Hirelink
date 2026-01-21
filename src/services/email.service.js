/**
 * Email service.
 *
 * Renders HTML templates and sends emails (verification, password reset,
 * security alerts).
 *
 * Notes:
 * - Template rendering uses Embedded JavaScript (EJS) templates from the `templates/` folder.
 * - In non-production environments, most emails are skipped and logged for development.
 * - Transport configuration lives in `src/lib/email.js`.
 *
 * References:
 * - Nodemailer: https://nodemailer.com/about/
 * - EJS: https://ejs.co/
 */

import env from "../config/env.js";
import sendEmail from "../lib/email.js";
import logger from "../lib/logger.js";
import { renderTemplate } from "../utils/renderTemplate.utils.js";

/**
 * Sends an email verification message.
 * @param {string} to
 * @param {string} verificationUrl
 * @param {{ expiryMinutes?: number }} options
 */
export async function sendVerificationEmail(
	to,
	verificationUrl,
	{ expiryMinutes = 5 },
) {
	const safeUrl = encodeURI(verificationUrl);

	if (!env.EMAIL_SEND) {
		logger.info(
			{ to, verificationUrl: safeUrl },
			"[dev] verification email skipped",
		);
		return true;
	}

	const html = await renderTemplate("verifyEmail.ejs", {
		verificationUrl: safeUrl,
		expiryMinutes,
	});

	return sendEmail({
		to,
		subject: "[Hirelink] Verify Your Email",
		html,
	});
}

/**
 * Sends a security alert email (for example, refresh token replay detected).
 * @param {string} to
 * @param {string} passwordResetUrl
 * @param {{ expiryMinutes?: number }} options
 */
export async function sendSecurityAlertEmail(
	to,
	passwordResetUrl,
	{ expiryMinutes = 5 },
) {
	const safeUrl = encodeURI(passwordResetUrl);

	if (!env.EMAIL_SEND) {
		logger.warn(
			{ to, passwordResetUrl: safeUrl },
			"[dev] security alert email skipped",
		);
		return true;
	}

	const html = await renderTemplate("securityAlert.ejs", {
		passwordResetUrl: safeUrl,
		expiryMinutes,
	});

	return sendEmail({
		to,
		subject: "[Hirelink] Reset your password",
		html,
	});
}

/**
 * Sends a password reset email.
 * @param {string} to
 * @param {string} resetUrl
 * @param {{ expiryMinutes?: number }} options
 */
export async function sendPasswordResetEmail(
	to,
	resetUrl,
	{ expiryMinutes = 5 },
) {
	const safeUrl = encodeURI(resetUrl);

	if (!env.EMAIL_SEND) {
		logger.info(
			{ to, resetUrl: safeUrl },
			"[dev] password reset email skipped",
		);
		return true;
	}
	const html = await renderTemplate("passwordReset.ejs", {
		resetUrl: safeUrl,
		expiryMinutes,
	});

	return sendEmail({
		to,
		subject: "[Hirelink] Reset Your Password",
		html,
	});
}
