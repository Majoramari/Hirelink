import { Role } from "@prisma/client";
import { cloudinary } from "../config/cloudinary.js";
import env from "../config/env.js";
import statusCodes from "../config/statusCodes.js";
import logger from "../lib/logger.js";
import prisma from "../lib/prisma.js";
import errorUtils from "../utils/error.utils.js";
import {
	generateToken,
	generateUlid,
	parseExpiry,
} from "../utils/general.utils.js";
import { result } from "../utils/response.utils.js";

export async function createProfile({ email, password, profileData }) {
	const verificationToken = generateToken();

	const [error, user] = await errorUtils(
		prisma.user.create({
			data: {
				id: generateUlid(),
				email,
				password,
				verificationToken,
				verificationExpiresAt: new Date(
					Date.now() + parseExpiry(env.EMAIL_VERIFICATION_EXPIRY),
				),
				role: Role.TALENT,
				talentProfile: {
					create: {
						// ! TALENT, DO NOT CREATE EMPLOYER PROFILE
						id: generateUlid(),
						...profileData,
					},
				},
			},
			include: {
				talentProfile: true,
			},
		}),
	);

	if (error) {
		return result({
			ok: false,
			statusCode: statusCodes.CONFLICT,
			message: "talent with this email already exists",
		});
	}

	return result({
		ok: true,
		statusCode: statusCodes.CREATED,
		message: "talent created",
		payload: user,
	});
}

export async function updateProfile(id, profileData) {
	const user = await prisma.user.update({
		where: { id },
		data: {
			talentProfile: {
				update: {
					...profileData,
				},
			},
		},
		include: {
			talentProfile: true,
		},
	});

	if (!user) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "talent not found",
		});
	}

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "talent updated",
		payload: user,
	});
}

export async function updateFile(type, id, file) {
	try {
		const user = await prisma.user.findUnique({
			where: { id },
			include: { talentProfile: true },
		});

		if (!user) {
			return result({
				ok: false,
				statusCode: statusCodes.NOT_FOUND,
				message: "talent not found",
			});
		}

		const fileId = user.talentProfile[`${type}PublicId`];

		// Delete old avatar/resume if exists
		if (fileId) {
			await cloudinary.uploader.destroy(fileId);
		}

		const updated = await prisma.user.update({
			where: { id },
			data: {
				talentProfile: {
					update: {
						[`${type}PublicId`]: file.filename,
					},
				},
			},
			include: { talentProfile: true },
		});

		return result({
			ok: true,
			statusCode: statusCodes.OK,
			message: `talent ${type} updated`,
			payload: updated,
		});
	} catch (err) {
		logger.error(err);

		return result({
			ok: false,
			statusCode: statusCodes.INTERNAL_SERVER_ERROR,
			message: `error updating ${type}`,
		});
	}
}

export async function getFile(type, id, { width = 200, height = 200 }) {
	try {
		const user = await prisma.user.findUnique({
			where: { id },
			include: { talentProfile: true },
		});

		if (!user) {
			return result({
				ok: false,
				statusCode: statusCodes.NOT_FOUND,
				message: "talent not found",
			});
		}

		const fileId = user.talentProfile[`${type}PublicId`];

		if (!fileId) {
			return result({
				ok: false,
				statusCode: statusCodes.NOT_FOUND,
				message: `talent ${type} not found`,
			});
		}

		const [error, _] = await errorUtils(
			cloudinary.api.resource(fileId, {
				resource_type: type === "avatar" ? "image" : "raw",
			}),
		);

		if (error) {
			logger.error(error);
			return result({
				ok: false,
				statusCode: statusCodes.NOT_FOUND,
				message: `talent ${type} not found`,
			});
		}

		const fileUrl = cloudinary.url(fileId, {
			folder: `${type}s`,
			resource_type: type === "avatar" ? "image" : "raw",
			...(type === "avatar" ? { width, height, crop: "fill" } : {}),
		});

		return result({
			ok: true,
			statusCode: statusCodes.OK,
			message: `talent ${type} fetched`,
			payload: {
				[type]: fileUrl,
			},
		});
	} catch (err) {
		logger.error(err);

		return result({
			ok: false,
			statusCode: statusCodes.INTERNAL_SERVER_ERROR,
			message: `error fetching ${type}`,
		});
	}
}

export async function deleteFile(type, id) {
	try {
		const user = await prisma.user.findUnique({
			where: { id },
			include: { talentProfile: true },
		});

		if (!user) {
			return result({
				ok: false,
				statusCode: statusCodes.NOT_FOUND,
				message: "talent not found",
			});
		}

		const fileId = user.talentProfile[`${type}PublicId`];

		if (!fileId) {
			return result({
				ok: false,
				statusCode: statusCodes.NOT_FOUND,
				message: `talent ${type} not found`,
			});
		}

		const [error, _] = await errorUtils(cloudinary.api.resource(fileId));

		if (error) {
			return result({
				ok: false,
				statusCode: statusCodes.NOT_FOUND,
				message: `talent ${type} not found`,
			});
		}

		if (fileId) {
			await cloudinary.uploader.destroy(fileId);
		}

		return result({
			ok: true,
			statusCode: statusCodes.OK,
			message: `talent ${type} deleted`,
		});
	} catch (err) {
		logger.error(err);

		return result({
			ok: false,
			statusCode: statusCodes.INTERNAL_SERVER_ERROR,
			message: `error deleting ${type}`,
		});
	}
}
