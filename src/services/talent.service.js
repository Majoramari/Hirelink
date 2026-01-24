/**
 * Talent service.
 *
 * Implements talent-specific profile operations:
 * - creating the TALENT user + profile
 * - updating profile fields
 * - managing profile files stored in Cloudinary (avatar/resume)
 * - managing skills and languages used for recommendations
 *
 * Notes:
 * - Skill/language input is normalized into a stable `normalizedName` key to prevent duplicates
 *   and to match user-typed variants (for example, "Node.js" versus "nodejs").
 * - File storage is delegated to `profileFile.service.js`.
 * - Role/profile invariants are enforced: TALENT users must have a talent profile and must not
 *   have an employer profile.
 *
 * References:
 * - Prisma Client queries: https://www.prisma.io/docs/orm/prisma-client/queries
 * - Cloudinary docs: https://cloudinary.com/documentation
 */

import env from "../config/env.js";
import { Role } from "../generated/prisma/client.ts";
import prisma from "../lib/prisma.js";
import errorUtils from "../utils/error.utils.js";
import {
	generateToken,
	generateUlid,
	parseExpiry,
} from "../utils/general.utils.js";
import {
	normalizeDisplayName,
	normalizedNameKey,
} from "../utils/nameNormalization.utils.js";
import { result } from "../utils/response.utils.js";
import {
	findFuzzyLanguage,
	findFuzzySkill,
	getOrCreateLanguageByNormalizedName,
	getOrCreateSkillByNormalizedName,
} from "../utils/skillLanguage.utils.js";
import statusCodes from "../utils/statusCodes.utils.js";
import {
	deleteProfileFile,
	getProfileFileUrl,
	updateProfileFile,
} from "./profileFile.service.js";

/**
 * Creates a new TALENT user and associated talent profile.
 * @param {{ email: string, password: string, profileData: object }} params Parameters.
 */
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
						// TALENT: do not create an employer profile
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

async function resolveSkillIdForUpsert(tx, payload) {
	if (payload?.skillId) {
		return payload.skillId;
	}
	const name = normalizeDisplayName(payload?.name);
	const key = normalizedNameKey(name);
	if (!name || !key) {
		return null;
	}
	const row = await getOrCreateSkillByNormalizedName(
		tx,
		{ name, normalizedName: key },
		{ generateId: generateUlid },
	);
	return row.id;
}

async function resolveSkillIdForLookup(tx, payload) {
	if (payload?.skillId) {
		return payload.skillId;
	}
	const name = normalizeDisplayName(payload?.name);
	const key = normalizedNameKey(name);
	if (!name || !key) {
		return null;
	}

	const byNormalized = await tx.skill.findFirst({
		where: { normalizedName: key },
		select: { id: true },
	});
	if (byNormalized) {
		return byNormalized.id;
	}

	const byName = await tx.skill.findFirst({
		where: { name: { equals: name, mode: "insensitive" } },
		select: { id: true },
	});
	if (byName) {
		return byName.id;
	}

	const fuzzy = await findFuzzySkill(tx, key);
	return fuzzy?.id || null;
}

async function resolveLanguageIdForUpsert(tx, payload) {
	if (payload?.languageId) {
		return payload.languageId;
	}
	const name = normalizeDisplayName(payload?.name);
	const key = normalizedNameKey(name);
	if (!name || !key) {
		return null;
	}
	const row = await getOrCreateLanguageByNormalizedName(
		tx,
		{
			name,
			normalizedName: key,
		},
		{ generateId: generateUlid },
	);
	return row.id;
}

async function resolveLanguageIdForLookup(tx, payload) {
	if (payload?.languageId) {
		return payload.languageId;
	}
	const name = normalizeDisplayName(payload?.name);
	const key = normalizedNameKey(name);
	if (!name || !key) {
		return null;
	}

	const byNormalized = await tx.language.findFirst({
		where: { normalizedName: key },
		select: { id: true },
	});
	if (byNormalized) {
		return byNormalized.id;
	}

	const byName = await tx.language.findFirst({
		where: { name: { equals: name, mode: "insensitive" } },
		select: { id: true },
	});
	if (byName) {
		return byName.id;
	}

	const fuzzy = await findFuzzyLanguage(tx, key);
	return fuzzy?.id || null;
}

async function listTalentSkills(tx, talentId) {
	const rows = await tx.talentSkill.findMany({
		where: { talentId },
		select: {
			skillId: true,
			level: true,
			skill: { select: { name: true } },
		},
		orderBy: { createdAt: "asc" },
	});
	return rows.map((r) => ({
		skillId: r.skillId,
		name: r.skill.name,
		level: r.level,
	}));
}

async function listTalentLanguages(tx, talentId) {
	const rows = await tx.talentLanguage.findMany({
		where: { talentId },
		select: {
			languageId: true,
			proficiency: true,
			language: { select: { name: true } },
		},
		orderBy: { createdAt: "asc" },
	});
	return rows.map((r) => ({
		languageId: r.languageId,
		name: r.language.name,
		proficiency: r.proficiency,
	}));
}

export async function upsertSkill(userId, payload) {
	const guard = await getTalent(userId);
	if (!guard.ok) {
		return guard.result;
	}

	const talentId = await getTalentIdByUserId(userId);
	if (!talentId) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "talent not found",
		});
	}

	const updated = await prisma.$transaction(async (tx) => {
		const skillId = await resolveSkillIdForUpsert(tx, payload);
		if (!skillId) {
			return { ok: false };
		}

		await tx.talentSkill.upsert({
			where: { talentId_skillId: { talentId, skillId } },
			update: { level: payload.level || "INTERMEDIATE" },
			create: {
				id: generateUlid(),
				talentId,
				skillId,
				level: payload.level || "INTERMEDIATE",
			},
		});

		return { skills: await listTalentSkills(tx, talentId) };
	});

	if (updated.ok === false) {
		return result({
			ok: false,
			statusCode: statusCodes.BAD_REQUEST,
			message: "invalid skill",
		});
	}

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "talent skill updated",
		payload: updated,
	});
}

export async function removeSkill(userId, payload) {
	const guard = await getTalent(userId);
	if (!guard.ok) {
		return guard.result;
	}

	const talentId = await getTalentIdByUserId(userId);
	if (!talentId) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "talent not found",
		});
	}

	const updated = await prisma.$transaction(async (tx) => {
		const skillId = await resolveSkillIdForLookup(tx, payload);
		if (!skillId) {
			return { ok: false };
		}
		await tx.talentSkill.deleteMany({ where: { talentId, skillId } });
		return { skills: await listTalentSkills(tx, talentId) };
	});

	if (updated.ok === false) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "skill not found",
		});
	}

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "talent skill removed",
		payload: updated,
	});
}

export async function upsertLanguage(userId, payload) {
	const guard = await getTalent(userId);
	if (!guard.ok) {
		return guard.result;
	}

	const talentId = await getTalentIdByUserId(userId);
	if (!talentId) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "talent not found",
		});
	}

	const updated = await prisma.$transaction(async (tx) => {
		const languageId = await resolveLanguageIdForUpsert(tx, payload);
		if (!languageId) {
			return { ok: false };
		}

		await tx.talentLanguage.upsert({
			where: { talentId_languageId: { talentId, languageId } },
			update: { proficiency: payload.proficiency || "INTERMEDIATE" },
			create: {
				id: generateUlid(),
				talentId,
				languageId,
				proficiency: payload.proficiency || "INTERMEDIATE",
			},
		});

		return { languages: await listTalentLanguages(tx, talentId) };
	});

	if (updated.ok === false) {
		return result({
			ok: false,
			statusCode: statusCodes.BAD_REQUEST,
			message: "invalid language",
		});
	}

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "talent language updated",
		payload: updated,
	});
}

export async function removeLanguage(userId, payload) {
	const guard = await getTalent(userId);
	if (!guard.ok) {
		return guard.result;
	}

	const talentId = await getTalentIdByUserId(userId);
	if (!talentId) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "talent not found",
		});
	}

	const updated = await prisma.$transaction(async (tx) => {
		const languageId = await resolveLanguageIdForLookup(tx, payload);
		if (!languageId) {
			return { ok: false };
		}
		await tx.talentLanguage.deleteMany({ where: { talentId, languageId } });
		return { languages: await listTalentLanguages(tx, talentId) };
	});

	if (updated.ok === false) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "language not found",
		});
	}

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "talent language removed",
		payload: updated,
	});
}

async function getTalent(userId) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			role: true,
			talentProfile: { select: { id: true } },
			employerProfile: { select: { id: true } },
		},
	});

	if (!user) {
		return {
			ok: false,
			result: result({
				ok: false,
				statusCode: statusCodes.NOT_FOUND,
				message: "talent not found",
			}),
		};
	}

	if (user.role !== Role.TALENT) {
		return {
			ok: false,
			result: result({
				ok: false,
				statusCode: statusCodes.FORBIDDEN,
				message: "forbidden",
			}),
		};
	}

	if (!user.talentProfile) {
		return {
			ok: false,
			result: result({
				ok: false,
				statusCode: statusCodes.NOT_FOUND,
				message: "talent not found",
			}),
		};
	}

	if (user.employerProfile) {
		return {
			ok: false,
			result: result({
				ok: false,
				statusCode: statusCodes.CONFLICT,
				message: "role/profile mismatch",
			}),
		};
	}

	return { ok: true, user };
}

async function getTalentIdByUserId(userId) {
	const talent = await prisma.talent.findUnique({
		where: { userId },
		select: { id: true },
	});
	return talent?.id;
}

export async function setSkills(userId, skills) {
	const guard = await getTalent(userId);
	if (!guard.ok) {
		return guard.result;
	}

	const talentId = await getTalentIdByUserId(userId);
	if (!talentId) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "talent not found",
		});
	}

	const uniqueBySlug = new Map();
	for (const s of skills || []) {
		const name = normalizeDisplayName(s?.name);
		const key = normalizedNameKey(name);
		if (!name || !key) {
			continue;
		}
		if (!uniqueBySlug.has(key)) {
			uniqueBySlug.set(key, {
				name,
				normalizedName: key,
				level: s?.level,
			});
		}
	}
	const normalized = Array.from(uniqueBySlug.values());

	const payload = await prisma.$transaction(async (tx) => {
		await tx.talentSkill.deleteMany({ where: { talentId } });
		if (normalized.length === 0) {
			return { skills: [] };
		}

		const skillRows = [];
		for (const s of normalized) {
			const row = await getOrCreateSkillByNormalizedName(tx, s, {
				generateId: generateUlid,
			});
			skillRows.push({ skill: row, level: s.level || "INTERMEDIATE" });
		}

		await tx.talentSkill.createMany({
			data: skillRows.map((s) => ({
				id: generateUlid(),
				talentId,
				skillId: s.skill.id,
				level: s.level,
			})),
		});

		return {
			skills: skillRows.map((s) => ({
				skillId: s.skill.id,
				name: s.skill.name,
				level: s.level,
			})),
		};
	});

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "talent skills updated",
		payload,
	});
}

export async function setLanguages(userId, languages) {
	const guard = await getTalent(userId);
	if (!guard.ok) {
		return guard.result;
	}

	const talentId = await getTalentIdByUserId(userId);
	if (!talentId) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "talent not found",
		});
	}

	const uniqueBySlug = new Map();
	for (const l of languages || []) {
		const name = normalizeDisplayName(l?.name);
		const key = normalizedNameKey(name);
		if (!name || !key) {
			continue;
		}
		if (!uniqueBySlug.has(key)) {
			uniqueBySlug.set(key, {
				name,
				normalizedName: key,
				proficiency: l?.proficiency,
			});
		}
	}
	const normalized = Array.from(uniqueBySlug.values());

	const payload = await prisma.$transaction(async (tx) => {
		await tx.talentLanguage.deleteMany({ where: { talentId } });
		if (normalized.length === 0) {
			return { languages: [] };
		}

		const languageRows = [];
		for (const l of normalized) {
			const row = await getOrCreateLanguageByNormalizedName(tx, l, {
				generateId: generateUlid,
			});
			languageRows.push({
				language: row,
				proficiency: l.proficiency || "INTERMEDIATE",
			});
		}

		await tx.talentLanguage.createMany({
			data: languageRows.map((l) => ({
				id: generateUlid(),
				talentId,
				languageId: l.language.id,
				proficiency: l.proficiency,
			})),
		});

		return {
			languages: languageRows.map((l) => ({
				languageId: l.language.id,
				name: l.language.name,
				proficiency: l.proficiency,
			})),
		};
	});

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "talent languages updated",
		payload,
	});
}

/**
 * Updates talent profile fields.
 * @param {string} id
 * @param {object} profileData
 */
export async function updateProfile(id, profileData) {
	const guard = await getTalent(id);
	if (!guard.ok) {
		return guard.result;
	}

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

/**
 * Updates a talent profile file reference (avatar/resume).
 * @param {"avatar"|"resume"} type
 * @param {string} id
 * @param {import("multer").File} file
 */
export async function updateFile(type, id, file) {
	const response = await updateProfileFile({
		userId: id,
		profileKey: "talentProfile",
		field: `${type}PublicId`,
		file,
		resourceType: type === "avatar" ? "image" : "raw",
	});

	return {
		...response,
		message: response.ok ? `talent ${type} updated` : `error updating ${type}`,
	};
}

/**
 * Gets a Cloudinary URL for a talent profile file.
 * @param {"avatar"|"resume"} type
 * @param {string} id
 * @param {{ width?: number, height?: number }} options
 */
export async function getFile(type, id, { width = 200, height = 200 }) {
	const response = await getProfileFileUrl({
		userId: id,
		profileKey: "talentProfile",
		field: `${type}PublicId`,
		resourceType: type === "avatar" ? "image" : "raw",
		folder: `${type}s`,
		responseKey: type,
		width: Number(width),
		height: Number(height),
	});

	return {
		...response,
		message: response.ok ? `talent ${type} fetched` : `error fetching ${type}`,
	};
}

/**
 * Deletes a talent profile file.
 * @param {"avatar"|"resume"} type
 * @param {string} id
 */
export async function deleteFile(type, id) {
	const response = await deleteProfileFile({
		userId: id,
		profileKey: "talentProfile",
		field: `${type}PublicId`,
		resourceType: type === "avatar" ? "image" : "raw",
	});

	return {
		...response,
		message: response.ok ? `talent ${type} deleted` : `error deleting ${type}`,
	};
}
