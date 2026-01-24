/**
 * Moderation service.
 *
 * Implements moderator-only operations:
 * - stats aggregation
 * - listing users and jobs
 * - activating/deactivating users
 * - deleting jobs
 *
 * Notes:
 * - This service is the enforcement point for moderation business rules.
 * - High-impact operations should be audited via logs.
 *
 * References:
 * - OWASP Access Control: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
 */

import prisma from "../lib/prisma.js";
import { result } from "../utils/response.utils.js";
import statusCodes from "../utils/statusCodes.utils.js";
import { deleteUser as deleteUserAccount } from "./user.service.js";

export async function getStats() {
	const [
		usersTotal,
		talentsTotal,
		employersTotal,
		moderatorsTotal,
		jobsTotal,
		applicationsTotal,
	] = await Promise.all([
		prisma.user.count(),
		prisma.user.count({ where: { role: "TALENT" } }),
		prisma.user.count({ where: { role: "EMPLOYER" } }),
		prisma.user.count({ where: { role: "MODERATOR" } }),
		prisma.job.count(),
		prisma.application.count(),
	]);

	const [usersActive, usersInactive] = await Promise.all([
		prisma.user.count({ where: { isActive: true } }),
		prisma.user.count({ where: { isActive: false } }),
	]);

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "stats fetched",
		payload: {
			users: {
				total: usersTotal,
				active: usersActive,
				inactive: usersInactive,
				byRole: {
					talent: talentsTotal,
					employer: employersTotal,
					moderator: moderatorsTotal,
				},
			},
			jobs: { total: jobsTotal },
			applications: { total: applicationsTotal },
		},
	});
}

export async function listUsers({ role, isActive, limit = 20, skip = 0 }) {
	const where = {
		...(role ? { role } : {}),
		...(typeof isActive === "boolean" ? { isActive } : {}),
	};

	const users = await prisma.user.findMany({
		where,
		take: limit,
		skip,
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			email: true,
			role: true,
			isActive: true,
			isEmailVerified: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "users fetched",
		payload: users,
	});
}

export async function setUserActive(userId, isActive) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, role: true },
	});
	if (!user) {
		return result({
			ok: false,
			statusCode: statusCodes.NOT_FOUND,
			message: "user not found",
		});
	}

	if (user.role === "MODERATOR" && isActive === false) {
		return result({
			ok: false,
			statusCode: statusCodes.FORBIDDEN,
			message: "moderator accounts cannot be deactivated",
		});
	}

	const updated = await prisma.user.update({
		where: { id: userId },
		data: { isActive },
		select: {
			id: true,
			email: true,
			role: true,
			isActive: true,
			updatedAt: true,
		},
	});

	return result({
		ok: true,
		statusCode: statusCodes.OK,
		message: "user updated",
		payload: updated,
	});
}

export async function listJobs({ limit = 20, skip = 0 }) {
	const jobs = await prisma.job.findMany({
		take: limit,
		skip,
		orderBy: { createdAt: "desc" },
		include: {
			employer: {
				select: {
					companyName: true,
					user: { select: { email: true } },
				},
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

export async function deleteJob(jobId) {
	const existing = await prisma.job.findUnique({
		where: { id: jobId },
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
		payload: null,
	});
}

export async function deleteUser(userId) {
	return deleteUserAccount(userId);
}
