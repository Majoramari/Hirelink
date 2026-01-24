/**
 * Job service.
 *
 * Implements job-related business logic:
 * - employer job create/update/list/get/delete (ownership enforced)
 * - job feed for logged-in talent
 *   - `mode=recent`: latest published jobs
 *   - `mode=recommended`: score jobs based on the talent's skills/languages
 * - job details
 	return prisma.talent.findUnique({
		where: { userId },
		select: {
			id: true,
			skills: { select: { skillId: true } },
			languages: { select: { languageId: true } },
		},
	});*
 * Notes:
 * - Services are the domain layer: they should return `result({ ok, statusCode, ... })`
 *   without handling Express responses.
 *
 * References:
 * - Prisma filtering/relations: https://www.prisma.io/docs/orm/prisma-client/queries
 */

import prisma from "../lib/prisma.js";
import { generateUlid } from "../utils/general.utils.js";
import {
	flattenJob,
	flattenJobs,
	normalizeRequiredLanguageInput,
	normalizeRequiredSkillInput,
} from "../utils/jobRequirements.utils.js";
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

export async function upsertEmployerJobSkill(userId, jobId, payload) {
	const employer = await getEmployerByUserId(userId);
	if (!employer) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "employer not found",
		});
	}

	const updated = await prisma.$transaction(async (tx) => {
		const ownedJobId = await getEmployerOwnedJobId(tx, {
			employerId: employer.id,
			jobId,
		});
		if (!ownedJobId) {
			return null;
		}

		const skillId = await resolveSkillIdForUpsert(tx, payload);
		if (!skillId) {
			return { ok: false, code: "bad_skill" };
		}

		await tx.jobSkill.upsert({
			where: { jobId_skillId: { jobId: ownedJobId, skillId } },
			update: { required: payload.required ?? true },
			create: {
				id: generateUlid(),
				jobId: ownedJobId,
				skillId,
				required: payload.required ?? true,
			},
		});

		return tx.job.findUnique({
			where: { id: ownedJobId },
			include: {
				requiredSkills: {
					include: {
						skill: { select: { id: true, name: true, normalizedName: true } },
					},
				},
				requiredLanguages: {
					include: {
						language: {
							select: { id: true, name: true, normalizedName: true },
						},
					},
				},
			},
		});
	});

	if (updated == null) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "job not found",
		});
	}
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
		message: "job skill updated",
		payload: flattenJob(updated),
	});
}

export async function removeEmployerJobSkill(userId, jobId, payload) {
	const employer = await getEmployerByUserId(userId);
	if (!employer) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "employer not found",
		});
	}

	const updated = await prisma.$transaction(async (tx) => {
		const ownedJobId = await getEmployerOwnedJobId(tx, {
			employerId: employer.id,
			jobId,
		});
		if (!ownedJobId) {
			return null;
		}

		const skillId = await resolveSkillIdForLookup(tx, payload);
		if (!skillId) {
			return { ok: false, code: "skill_not_found" };
		}

		await tx.jobSkill.deleteMany({ where: { jobId: ownedJobId, skillId } });
		return tx.job.findUnique({
			where: { id: ownedJobId },
			include: {
				requiredSkills: {
					include: {
						skill: { select: { id: true, name: true, normalizedName: true } },
					},
				},
				requiredLanguages: {
					include: {
						language: {
							select: { id: true, name: true, normalizedName: true },
						},
					},
				},
			},
		});
	});

	if (updated == null) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "job not found",
		});
	}
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
		message: "job skill removed",
		payload: flattenJob(updated),
	});
}

export async function upsertEmployerJobLanguage(userId, jobId, payload) {
	const employer = await getEmployerByUserId(userId);
	if (!employer) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "employer not found",
		});
	}

	const updated = await prisma.$transaction(async (tx) => {
		const ownedJobId = await getEmployerOwnedJobId(tx, {
			employerId: employer.id,
			jobId,
		});
		if (!ownedJobId) {
			return null;
		}

		const languageId = await resolveLanguageIdForUpsert(tx, payload);
		if (!languageId) {
			return { ok: false, code: "bad_language" };
		}

		await tx.jobLanguage.upsert({
			where: { jobId_languageId: { jobId: ownedJobId, languageId } },
			update: {
				required: payload.required ?? true,
				minimumProficiency: payload.minimumProficiency,
			},
			create: {
				id: generateUlid(),
				jobId: ownedJobId,
				languageId,
				required: payload.required ?? true,
				minimumProficiency: payload.minimumProficiency,
			},
		});

		return tx.job.findUnique({
			where: { id: ownedJobId },
			include: {
				requiredSkills: {
					include: {
						skill: { select: { id: true, name: true, normalizedName: true } },
					},
				},
				requiredLanguages: {
					include: {
						language: {
							select: { id: true, name: true, normalizedName: true },
						},
					},
				},
			},
		});
	});

	if (updated == null) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "job not found",
		});
	}
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
		message: "job language updated",
		payload: flattenJob(updated),
	});
}

export async function removeEmployerJobLanguage(userId, jobId, payload) {
	const employer = await getEmployerByUserId(userId);
	if (!employer) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "employer not found",
		});
	}

	const updated = await prisma.$transaction(async (tx) => {
		const ownedJobId = await getEmployerOwnedJobId(tx, {
			employerId: employer.id,
			jobId,
		});
		if (!ownedJobId) {
			return null;
		}

		const languageId = await resolveLanguageIdForLookup(tx, payload);
		if (!languageId) {
			return { ok: false, code: "language_not_found" };
		}

		await tx.jobLanguage.deleteMany({
			where: { jobId: ownedJobId, languageId },
		});
		return tx.job.findUnique({
			where: { id: ownedJobId },
			include: {
				requiredSkills: {
					include: {
						skill: { select: { id: true, name: true, normalizedName: true } },
					},
				},
				requiredLanguages: {
					include: {
						language: {
							select: { id: true, name: true, normalizedName: true },
						},
					},
				},
			},
		});
	});

	if (updated == null) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "job not found",
		});
	}
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
		message: "job language removed",
		payload: flattenJob(updated),
	});
}

async function getEmployerOwnedJobId(tx, { employerId, jobId }) {
	const job = await tx.job.findFirst({
		where: { id: jobId, employerId },
		select: { id: true },
	});
	return job?.id || null;
}

async function resolveSkillIdForUpsert(tx, input) {
	if (input?.skillId) {
		return input.skillId;
	}
	const name = normalizeDisplayName(input?.name);
	const key = normalizedNameKey(name);
	if (!name || !key) {
		return null;
	}
	const row = await getOrCreateSkillByNormalizedName(
		tx,
		{
			name,
			normalizedName: key,
		},
		{ generateId: generateUlid },
	);
	return row.id;
}

async function resolveSkillIdForLookup(tx, input) {
	if (input?.skillId) {
		return input.skillId;
	}
	const name = normalizeDisplayName(input?.name);
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

async function resolveLanguageIdForUpsert(tx, input) {
	if (input?.languageId) {
		return input.languageId;
	}
	const name = normalizeDisplayName(input?.name);
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

async function resolveLanguageIdForLookup(tx, input) {
	if (input?.languageId) {
		return input.languageId;
	}
	const name = normalizeDisplayName(input?.name);
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

/**
 * Gets the employer profile for a given user id.
 * @param {string} userId
 */
async function getEmployerByUserId(userId) {
	return prisma.employer.findUnique({
		where: { userId },
		select: { id: true },
	});
}

async function getTalentByUserId(userId) {
	return prisma.talent.findUnique({
		where: { userId },
		select: {
			id: true,
			skills: { select: { skillId: true } },
			languages: { select: { languageId: true } },
		},
	});
}

export async function listTalentJobs({
	userId,
	mode = "recent",
	limit = 20,
	skip = 0,
}) {
	if (mode !== "recent" && mode !== "recommended") {
		return result({
			ok: false,
			statusCode: statusCodes.BAD_REQUEST,
			message: "invalid mode",
		});
	}

	if (mode === "recent") {
		return listPublicJobs({ limit, skip });
	}

	const talent = await getTalentByUserId(userId);
	if (!talent) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "talent not found",
		});
	}

	const talentSkillIds = new Set((talent.skills || []).map((s) => s.skillId));
	const talentLanguageIds = new Set(
		(talent.languages || []).map((l) => l.languageId),
	);

	if (talentSkillIds.size === 0 && talentLanguageIds.size === 0) {
		return listPublicJobs({ limit, skip });
	}

	const candidateJobs = await prisma.job.findMany({
		take: 100,
		skip: 0,
		orderBy: { publishedAt: "desc" },
		include: {
			employer: { select: { companyName: true } },
			requiredSkills: {
				select: {
					skillId: true,
					required: true,
					skill: { select: { name: true } },
				},
			},
			requiredLanguages: {
				select: {
					languageId: true,
					required: true,
					minimumProficiency: true,
					language: { select: { name: true } },
				},
			},
		},
	});

	const scored = candidateJobs
		.map((job) => {
			let score = 0;
			for (const s of job.requiredSkills || []) {
				if (talentSkillIds.has(s.skillId)) {
					score += s.required ? 2 : 1;
				}
			}
			for (const l of job.requiredLanguages || []) {
				if (talentLanguageIds.has(l.languageId)) {
					score += l.required ? 2 : 1;
				}
			}
			return { job, score };
		})
		.filter((x) => x.score > 0)
		.sort((a, b) => {
			if (b.score !== a.score) {
				return b.score - a.score;
			}
			return (
				new Date(b.job.publishedAt).getTime() -
				new Date(a.job.publishedAt).getTime()
			);
		});

	if (scored.length === 0) {
		return listPublicJobs({ limit, skip });
	}

	const page = scored.slice(skip, skip + limit).map((x) => flattenJob(x.job));
	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "jobs fetched",
		payload: page,
	});
}

/**
 * Creates a job for the authenticated employer.
 * @param {string} userId
 * @param {object} payload
 */
export async function createEmployerJob(userId, payload) {
	const employer = await getEmployerByUserId(userId);
	if (!employer) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "employer not found",
		});
	}

	const { requiredSkills, requiredLanguages, ...jobData } = payload;

	const normalizedSkills = requiredSkills
		? normalizeRequiredSkillInput(requiredSkills)
		: null;
	if (normalizedSkills && !normalizedSkills.ok) {
		return result({
			ok: false,
			statusCode: statusCodes.BAD_REQUEST,
			message: "invalid requiredSkills",
		});
	}

	const normalizedLanguages = requiredLanguages
		? normalizeRequiredLanguageInput(requiredLanguages)
		: null;
	if (normalizedLanguages && !normalizedLanguages.ok) {
		return result({
			ok: false,
			statusCode: statusCodes.BAD_REQUEST,
			message: "invalid requiredLanguages",
		});
	}

	const created = await prisma.$transaction(async (tx) => {
		let skillCreates;
		if (normalizedSkills) {
			const resolved = [];
			for (const s of normalizedSkills.items) {
				if (s.skillId) {
					resolved.push({ skillId: s.skillId, required: s.required });
					continue;
				}
				const row = await getOrCreateSkillByNormalizedName(tx, s, {
					generateId: generateUlid,
				});
				resolved.push({ skillId: row.id, required: s.required });
			}
			skillCreates =
				resolved.length > 0
					? {
							create: resolved.map((s) => ({
								id: generateUlid(),
								skillId: s.skillId,
								required: s.required,
							})),
						}
					: undefined;
		}

		let languageCreates;
		if (normalizedLanguages) {
			const resolved = [];
			for (const l of normalizedLanguages.items) {
				if (l.languageId) {
					resolved.push({
						languageId: l.languageId,
						required: l.required,
						minimumProficiency: l.minimumProficiency,
					});
					continue;
				}
				const row = await getOrCreateLanguageByNormalizedName(tx, l, {
					generateId: generateUlid,
				});
				resolved.push({
					languageId: row.id,
					required: l.required,
					minimumProficiency: l.minimumProficiency,
				});
			}
			languageCreates =
				resolved.length > 0
					? {
							create: resolved.map((l) => ({
								id: generateUlid(),
								languageId: l.languageId,
								minimumProficiency: l.minimumProficiency,
								required: l.required,
							})),
						}
					: undefined;
		}

		return tx.job.create({
			data: {
				id: generateUlid(),
				employerId: employer.id,
				...jobData,
				requiredSkills: skillCreates,
				requiredLanguages: languageCreates,
			},
			include: {
				requiredSkills: {
					include: {
						skill: { select: { id: true, name: true, normalizedName: true } },
					},
				},
				requiredLanguages: {
					include: {
						language: {
							select: { id: true, name: true, normalizedName: true },
						},
					},
				},
			},
		});
	});

	return result({
		ok: true,
		statusCode: statusCodes.CREATED,
		message: "job created",
		payload: flattenJob(created),
	});
}

/**
 * Lists all jobs belonging to the authenticated employer.
 * @param {string} userId
 */
export async function listEmployerJobs(userId) {
	const employer = await getEmployerByUserId(userId);
	if (!employer) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "employer not found",
		});
	}

	const jobs = await prisma.job.findMany({
		where: { employerId: employer.id },
		orderBy: { createdAt: "desc" },
		include: {
			requiredSkills: {
				include: {
					skill: { select: { id: true, name: true, normalizedName: true } },
				},
			},
			requiredLanguages: {
				include: {
					language: { select: { id: true, name: true, normalizedName: true } },
				},
			},
		},
	});

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "jobs fetched",
		payload: flattenJobs(jobs),
	});
}

/**
 * Fetches a single job owned by the authenticated employer.
 * @param {string} userId
 * @param {string} jobId
 */
export async function getEmployerJob(userId, jobId) {
	const employer = await getEmployerByUserId(userId);
	if (!employer) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "employer not found",
		});
	}

	const job = await prisma.job.findFirst({
		where: { id: jobId, employerId: employer.id },
		include: {
			requiredSkills: {
				include: {
					skill: { select: { id: true, name: true, normalizedName: true } },
				},
			},
			requiredLanguages: {
				include: {
					language: { select: { id: true, name: true, normalizedName: true } },
				},
			},
		},
	});

	if (!job) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "job not found",
		});
	}

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "job fetched",
		payload: flattenJob(job),
	});
}

/**
 * Updates a job owned by the authenticated employer.
 * @param {string} userId
 * @param {string} jobId
 * @param {object} payload
 */
export async function updateEmployerJob(userId, jobId, payload) {
	const employer = await getEmployerByUserId(userId);
	if (!employer) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "employer not found",
		});
	}

	const existing = await prisma.job.findFirst({
		where: { id: jobId, employerId: employer.id },
		select: { id: true },
	});

	if (!existing) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "job not found",
		});
	}

	const { requiredSkills, requiredLanguages, ...jobData } = payload;

	const normalizedSkills = requiredSkills
		? normalizeRequiredSkillInput(requiredSkills)
		: null;
	if (normalizedSkills && !normalizedSkills.ok) {
		return result({
			ok: false,
			statusCode: statusCodes.BAD_REQUEST,
			message: "invalid requiredSkills",
		});
	}

	const normalizedLanguages = requiredLanguages
		? normalizeRequiredLanguageInput(requiredLanguages)
		: null;
	if (normalizedLanguages && !normalizedLanguages.ok) {
		return result({
			ok: false,
			statusCode: statusCodes.BAD_REQUEST,
			message: "invalid requiredLanguages",
		});
	}

	const updated = await prisma.$transaction(async (tx) => {
		if (normalizedSkills) {
			await tx.jobSkill.deleteMany({ where: { jobId } });
			const resolved = [];
			for (const s of normalizedSkills.items) {
				if (s.skillId) {
					resolved.push({ skillId: s.skillId, required: s.required });
					continue;
				}
				const row = await getOrCreateSkillByNormalizedName(tx, s, {
					generateId: generateUlid,
				});
				resolved.push({ skillId: row.id, required: s.required });
			}
			if (resolved.length > 0) {
				await tx.jobSkill.createMany({
					data: resolved.map((s) => ({
						id: generateUlid(),
						jobId,
						skillId: s.skillId,
						required: s.required,
					})),
				});
			}
		}

		if (normalizedLanguages) {
			await tx.jobLanguage.deleteMany({ where: { jobId } });
			const resolved = [];
			for (const l of normalizedLanguages.items) {
				if (l.languageId) {
					resolved.push({
						languageId: l.languageId,
						required: l.required,
						minimumProficiency: l.minimumProficiency,
					});
					continue;
				}
				const row = await getOrCreateLanguageByNormalizedName(tx, l, {
					generateId: generateUlid,
				});
				resolved.push({
					languageId: row.id,
					required: l.required,
					minimumProficiency: l.minimumProficiency,
				});
			}
			if (resolved.length > 0) {
				await tx.jobLanguage.createMany({
					data: resolved.map((l) => ({
						id: generateUlid(),
						jobId,
						languageId: l.languageId,
						minimumProficiency: l.minimumProficiency,
						required: l.required,
					})),
				});
			}
		}

		return tx.job.update({
			where: { id: jobId },
			data: jobData,
			include: {
				requiredSkills: {
					include: {
						skill: { select: { id: true, name: true, normalizedName: true } },
					},
				},
				requiredLanguages: {
					include: {
						language: {
							select: { id: true, name: true, normalizedName: true },
						},
					},
				},
			},
		});
	});

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "job updated",
		payload: flattenJob(updated),
	});
}

/**
 * Deletes a job owned by the authenticated employer.
 * @param {string} userId
 * @param {string} jobId
 */
export async function deleteEmployerJob(userId, jobId) {
	const employer = await getEmployerByUserId(userId);
	if (!employer) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "employer not found",
		});
	}

	const existing = await prisma.job.findFirst({
		where: { id: jobId, employerId: employer.id },
		select: { id: true },
	});

	if (!existing) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "job not found",
		});
	}

	await prisma.job.delete({ where: { id: jobId } });

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "job deleted",
	});
}

/**
 * Lists public jobs.
 * @param {{ limit?: number, skip?: number }} opts
 */
async function listPublicJobs({ limit = 20, skip = 0 }) {
	const jobs = await prisma.job.findMany({
		take: limit,
		skip,
		orderBy: { publishedAt: "desc" },
		include: {
			employer: {
				select: { companyName: true },
			},
			requiredSkills: {
				select: {
					skillId: true,
					required: true,
					skill: { select: { name: true } },
				},
			},
			requiredLanguages: {
				select: {
					languageId: true,
					required: true,
					minimumProficiency: true,
					language: { select: { name: true } },
				},
			},
		},
	});

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "jobs fetched",
		payload: flattenJobs(jobs),
	});
}

/**
 * Gets a public job by id.
 * @param {string} jobId
 */
export async function getPublicJob(jobId) {
	const job = await prisma.job.findUnique({
		where: { id: jobId },
		include: {
			employer: {
				select: { companyName: true },
			},
			requiredSkills: {
				include: {
					skill: { select: { id: true, name: true, normalizedName: true } },
				},
			},
			requiredLanguages: {
				include: {
					language: { select: { id: true, name: true, normalizedName: true } },
				},
			},
		},
	});

	if (!job) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "job not found",
		});
	}

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "job fetched",
		payload: flattenJob(job),
	});
}
