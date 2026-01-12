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
import { result } from "../utils/response.utils.js";
import statusCodes from "../utils/statusCodes.utils.js";

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
			requiredSkills: { select: { skillId: true, required: true } },
			requiredLanguages: { select: { languageId: true, required: true } },
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

	const page = scored.slice(skip, skip + limit).map((x) => x.job);
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

	const created = await prisma.job.create({
		data: {
			id: generateUlid(),
			employerId: employer.id,
			...jobData,
			requiredSkills: requiredSkills
				? {
						create: requiredSkills.map((s) => ({
							id: generateUlid(),
							skillId: s.skillId,
							required: s.required ?? true,
						})),
					}
				: undefined,
			requiredLanguages: requiredLanguages
				? {
						create: requiredLanguages.map((l) => ({
							id: generateUlid(),
							languageId: l.languageId,
							minimumProficiency: l.minimumProficiency,
							required: l.required ?? true,
						})),
					}
				: undefined,
		},
	});

	return result({
		ok: true,
		statusCode: statusCodes.CREATED,
		message: "job created",
		payload: created,
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
	});

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "jobs fetched",
		payload: jobs,
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
			requiredSkills: true,
			requiredLanguages: true,
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
		payload: job,
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

	const updated = await prisma.$transaction(async (tx) => {
		if (requiredSkills) {
			await tx.jobSkill.deleteMany({ where: { jobId } });
			await tx.jobSkill.createMany({
				data: requiredSkills.map((s) => ({
					id: generateUlid(),
					jobId,
					skillId: s.skillId,
					required: s.required ?? true,
				})),
			});
		}

		if (requiredLanguages) {
			await tx.jobLanguage.deleteMany({ where: { jobId } });
			await tx.jobLanguage.createMany({
				data: requiredLanguages.map((l) => ({
					id: generateUlid(),
					jobId,
					languageId: l.languageId,
					minimumProficiency: l.minimumProficiency,
					required: l.required ?? true,
				})),
			});
		}

		return tx.job.update({
			where: { id: jobId },
			data: jobData,
			include: {
				requiredSkills: true,
				requiredLanguages: true,
			},
		});
	});

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "job updated",
		payload: updated,
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
		},
	});

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "jobs fetched",
		payload: jobs,
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
			requiredSkills: true,
			requiredLanguages: true,
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
		payload: job,
	});
}
