import bcrypt from "bcrypt";
import env from "../config/env.js";
import statusCodes from "../config/statusCodes.js";
import ApiError from "../errors/ApiError.js";
import logger from "../lib/logger.js";
import prisma from "../lib/prisma.js";
import { parseExpiry } from "../utils/general.utils.js";
import { result } from "../utils/response.utils.js";
import {
	emailService,
	employerService,
	talentService,
	tokenService,
	userService,
	verificationService,
} from "./index.js";

export async function register({ email, password, role, profileData }) {
	const hashed = await bcrypt.hash(password, 10);
	const profileOptions = { email, password: hashed, profileData };

	let result;
	switch (role) {
		case "TALENT":
			result = await talentService.createProfile(profileOptions);
			break;
		case "EMPLOYER":
			result = await employerService.createProfile(profileOptions);
			break;
		default:
			throw new ApiError(statusCodes.BAD_REQUEST, "Invalid role");
	}

	if (!result.ok) {
		return result;
	}

	const verificationUrl = `${env.FRONTEND_URL}/verify?vt=${result.payload.verificationToken}`;

	emailService
		.sendVerificationEmail(result.payload.email, verificationUrl, {
			expiryMinutes: 5,
		})
		.catch((err) => {
			logger.error(err);
		});

	delete result.payload.password; // remove password, for security (this object will return to the controller)
	delete result.payload.verificationToken;
	delete result.payload.verificationExpiresAt;

	return result;
}

export async function verifyEmail({ verificationToken }) {
	const user = await prisma.user.findFirst({
		where: { verificationToken },
	});

	if (!user) {
		return result({
			ok: false,
			statusCode: statusCodes.BAD_REQUEST,
			message: "invalid or expired verification token",
		});
	}

	if (user.isEmailVerified) {
		await prisma.user.update({
			where: { id: user.id },
			data: {
				verificationToken: null,
				verificationExpiresAt: null,
			},
		});
		return result({
			ok: false,
			statusCode: statusCodes.BAD_REQUEST,
			message: "email already verified",
		});
	}

	if (!user.verificationExpiresAt || new Date() > user.verificationExpiresAt) {
		await prisma.user.update({
			where: { id: user.id },
			data: {
				verificationToken: null,
				verificationExpiresAt: null,
			},
		});
		return result({
			ok: false,
			statusCode: statusCodes.BAD_REQUEST,
			message: "verification token has expired",
			payload: null,
		});
	}

	const verifiedUser = await prisma.user.update({
		where: { id: user.id },
		data: {
			isEmailVerified: true,
			verificationToken: null,
			verificationExpiresAt: null,
		},
	});

	logger.debug(`User ${user.email} verified`);

	delete verifiedUser.password;
	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "email verified",
		payload: verifiedUser,
	});
}

export async function login(email, password) {
	const user = await userService.findUser(email);

	if (!user) {
		return result({
			ok: false,
			statusCode: statusCodes.UNAUTHORIZED,
			message: "invalid credentials",
		});
	}

	// --- Email not verified ---
	if (!user.isEmailVerified) {
		const verificationToken = await verificationService.resendVerificationToken(
			user.id,
		);

		const verificationUrl = `${env.FRONTEND_URL}/verify?vt=${verificationToken}`;

		emailService
			.sendVerificationEmail(user.email, verificationUrl, {
				expiryMinutes: 5,
			})
			.catch((err) => {
				logger.error(err);
			});

		return result({
			ok: true,
			statusCode: statusCodes.OK,
			message: "email verification required",
			payload: {
				requiresVerification: true,
				verificationToken,
			},
		});
	}

	// --- Password Check ---
	const isValidPassword = await bcrypt.compare(password, user.password);
	if (!isValidPassword) {
		return result({
			ok: false,
			statusCode: statusCodes.BAD_REQUEST,
			message: "invalid credentials",
		});
	}

	// --- Generate tokens ---
	const accessToken = tokenService.generateAccessToken(user.id);
	const refreshToken = tokenService.generateRefreshToken(user.id);

	const refreshExpiryMs = parseExpiry(env.JWT_REFRESH_EXPIRY);

	await tokenService.store(
		refreshToken,
		user.id,
		new Date(Date.now() + refreshExpiryMs),
	);

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "user logged in",
		payload: {
			token: accessToken,
			refreshToken,
			refreshExpiryMs,
		},
	});
}

export async function refresh(refreshToken) {
	const rotationResult = await tokenService.rotateRefreshToken(refreshToken);

	if (!rotationResult.ok) {
		return rotationResult;
	}

	// Generate new access token
	const accessToken = tokenService.generateAccessToken(
		rotationResult.payload.userId,
	);

	return {
		...rotationResult, // keep the same status code and message
		payload: {
			// add the new access token
			...rotationResult.payload,
			token: accessToken,
		},
	};
}

export async function getCurrent(userId) {
	const user = await userService.findUser(userId);

	if (!user) {
		return result({
			ok: false,
			statusCode: statusCodes.UNAUTHORIZED,
			message: "user not found",
		});
	}

	// --- Email not verified ---
	if (!user.isEmailVerified) {
		return result({
			ok: true,
			statusCode: statusCodes.OK,
			message: "email verification required",
			payload: {
				requiresVerification: true,
			},
		});
	}

	delete user.password;
	delete user.verificationToken;
	delete user.verificationExpiresAt;

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "user fetched",
		payload: user,
	});
}

export async function requestPasswordReset(email) {
	const user = await userService.findUser(email);

	if (!user) {
		// Don't reveal whether email exists - always return success
		return result({
			ok: true,
			statusCode: statusCodes.OK,
			message: "if an account exists, a password reset email has been sent",
		});
	}

	// Generate reset token
	const resetToken = await verificationService.generatePasswordResetToken(
		user.id,
	);

	const resetUrl = `${env.FRONTEND_URL}/reset?vt=${resetToken}`;

	// Send password reset email (non-blocking)
	emailService
		.sendPasswordResetEmail(user.email, resetUrl, {
			expiryMinutes: 5,
		})
		.catch((err) => {
			logger.error("Failed to send password reset email:", err);
		});

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "if an account exists, a password reset email has been sent",
	});
}

export async function resetPassword({
	verificationToken,
	newPassword,
	oldPassword,
}) {
	// Find user by verification token
	const user = await prisma.user.findFirst({
		where: { verificationToken },
	});

	if (!user) {
		return result({
			ok: false,
			statusCode: statusCodes.BAD_REQUEST,
			message: "invalid or expired reset token",
		});
	}

	// Check if token has expired
	if (!user.verificationExpiresAt || new Date() > user.verificationExpiresAt) {
		await prisma.user.update({
			where: { id: user.id },
			data: {
				verificationToken: null,
				verificationExpiresAt: null,
			},
		});
		return result({
			ok: false,
			statusCode: statusCodes.BAD_REQUEST,
			message: "reset token has expired",
		});
	}

	// If email is already verified and oldPassword is provided, verify it
	if (user.isEmailVerified && oldPassword) {
		const isValidPassword = await bcrypt.compare(oldPassword, user.password);
		if (!isValidPassword) {
			return result({
				ok: false,
				statusCode: statusCodes.BAD_REQUEST,
				message: "invalid old password",
			});
		}
	}

	// Hash new password
	const hashedPassword = await bcrypt.hash(newPassword, 10);

	// Update password and clear verification token atomically
	// Also revoke all refresh tokens for security
	await prisma.$transaction(async (tx) => {
		await tx.user.update({
			where: { id: user.id },
			data: {
				password: hashedPassword,
				isEmailVerified: true, // Verify email if not already verified
				verificationToken: null,
				verificationExpiresAt: null,
			},
		});

		// Revoke all active refresh tokens
		await tx.refreshToken.updateMany({
			where: { userId: user.id, revoked: false },
			data: {
				revoked: true,
				revokedAt: new Date(),
			},
		});
	});

	logger.info(`Password reset successful for user ${user.email}`);

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "password reset successful",
	});
}

export async function logout(refreshToken) {
	if (!refreshToken) {
		return result({
			ok: false,
			statusCode: statusCodes.BAD_REQUEST,
			message: "no token provided",
		});
	}

	return await tokenService.revokeRefreshToken(refreshToken);
}

export async function logoutAllDevices(userId) {
	try {
		await tokenService.revokeAllRefreshTokens(userId);

		return result({
			ok: true,
			statusCode: statusCodes.OK,
			message: "logged out from all devices",
		});
	} catch (error) {
		logger.error("Failed to logout all devices:", error);
		return result({
			ok: false,
			statusCode: statusCodes.INTERNAL_SERVER_ERROR,
			message: "logout failed",
		});
	}
}
