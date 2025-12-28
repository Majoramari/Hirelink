/**
 * Database seed script.
 *
 * Responsibilities:
 * - Creates predictable development data (users, profiles, skills/languages, jobs, applications).
 * - Is designed to be idempotent where possible (re-running should update/ensure data rather than duplicating it).
 *
 * Safety notes:
 * - Seeding is a destructive operation in the sense that it can overwrite dev credentials.
 * - Do not run this against production unless you explicitly intend to.
 *
 * Prisma 7 notes:
 * - Prisma 7 reads the seed command from `prisma.config.ts` (`migrations.seed`).
 *
 * References:
 * - Prisma seeding: https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding
 * - Prisma config: https://www.prisma.io/docs/orm/prisma-schema/overview/prisma-config
 */

import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { generateUlid } from "../src/utils/general.utils.js";
import {
	normalizeDisplayName,
	normalizedNameKey,
} from "../src/utils/nameNormalization.utils.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
	const seedPassword = "a@A345dsa";
	const seedTalentEmail = "talent1@hirelink.com";
	const seedTalent2Email = "talent2@hirelink.com";
	const seedEmployerEmail = "employer1@hirelink.com";
	const seedEmployer2Email = "employer2@hirelink.com";

	async function upsertSkill(name) {
		const displayName = normalizeDisplayName(name);
		const key = normalizedNameKey(displayName);

		if (key) {
			const byNormalized = await prisma.skill.findFirst({
				where: { normalizedName: key },
				select: { id: true, name: true, normalizedName: true },
			});
			if (byNormalized) {
				return prisma.skill.update({
					where: { id: byNormalized.id },
					data: { name: displayName },
					select: { id: true, name: true, normalizedName: true },
				});
			}
		}

		return prisma.skill.upsert({
			where: { name: displayName },
			create: { id: generateUlid(), name: displayName, normalizedName: key || null },
			update: { normalizedName: key || null },
			select: { id: true, name: true, normalizedName: true },
		});
	}

	async function upsertLanguage(name) {
		const displayName = normalizeDisplayName(name);
		const key = normalizedNameKey(displayName);

		if (key) {
			const byNormalized = await prisma.language.findFirst({
				where: { normalizedName: key },
				select: { id: true, name: true, normalizedName: true },
			});
			if (byNormalized) {
				return prisma.language.update({
					where: { id: byNormalized.id },
					data: { name: displayName },
					select: { id: true, name: true, normalizedName: true },
				});
			}
		}

		return prisma.language.upsert({
			where: { name: displayName },
			create: { id: generateUlid(), name: displayName, normalizedName: key || null },
			update: { normalizedName: key || null },
			select: { id: true, name: true, normalizedName: true },
		});
	}

	async function backfillNormalizedNames() {
		const skills = await prisma.skill.findMany({
			where: { normalizedName: null },
			select: { id: true, name: true },
		});
		for (const s of skills) {
			const key = normalizedNameKey(s.name);
			if (!key) continue;
			try {
				await prisma.skill.update({
					where: { id: s.id },
					data: { normalizedName: key },
				});
			} catch (_e) {
				// Likely a unique conflict if duplicates exist; keep existing canonical row.
			}
		}

		const languages = await prisma.language.findMany({
			where: { normalizedName: null },
			select: { id: true, name: true },
		});
		for (const l of languages) {
			const key = normalizedNameKey(l.name);
			if (!key) continue;
			try {
				await prisma.language.update({
					where: { id: l.id },
					data: { normalizedName: key },
				});
			} catch (_e) {
				// Likely a unique conflict if duplicates exist; keep existing canonical row.
			}
		}
	}

	async function upsertUserWithRole({ email, password, role, profileData }) {
		const existing = await prisma.user.findUnique({
			where: { email },
			select: { id: true, role: true },
		});

		if (existing && existing.role !== role) {
			throw new Error(
				`Cannot seed user: email ${email} exists with role ${existing.role} (wanted ${role})`,
			);
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		const user = await prisma.user.upsert({
			where: { email },
			create: {
				id: generateUlid(),
				email,
				password: hashedPassword,
				role,
				isActive: true,
				isEmailVerified: true,
				verificationToken: null,
				verificationExpiresAt: null,
				...(role === "TALENT"
					? {
						talentProfile: {
							create: {
								id: generateUlid(),
								...profileData,
							},
						},
					}
					: {}),
				...(role === "EMPLOYER"
					? {
						employerProfile: {
							create: {
								id: generateUlid(),
								...profileData,
							},
						},
					}
					: {}),
			},
			update: {
				password: hashedPassword,
				role,
				isActive: true,
				isEmailVerified: true,
				verificationToken: null,
				verificationExpiresAt: null,
				...(role === "TALENT"
					? {
						talentProfile: {
							upsert: {
								create: { id: generateUlid(), ...profileData },
								update: { ...profileData },
							},
						},
					}
					: {}),
				...(role === "EMPLOYER"
					? {
						employerProfile: {
							upsert: {
								create: { id: generateUlid(), ...profileData },
								update: { ...profileData },
							},
						},
					}
					: {}),
			},
			select: { id: true, email: true, role: true },
		});

		return user;
	}

	async function setTalentSkillsAndLanguages({ talentUserId, skills, languages }) {
		const talent = await prisma.talent.findUnique({
			where: { userId: talentUserId },
			select: { id: true },
		});
		if (!talent) return;

		await prisma.$transaction(async (tx) => {
			await tx.talentSkill.deleteMany({ where: { talentId: talent.id } });
			await tx.talentLanguage.deleteMany({ where: { talentId: talent.id } });

			if (skills.length > 0) {
				await tx.talentSkill.createMany({
					data: skills.map((s) => ({
						id: generateUlid(),
						talentId: talent.id,
						skillId: s.skillId,
						level: s.level,
					})),
				});
			}

			if (languages.length > 0) {
				await tx.talentLanguage.createMany({
					data: languages.map((l) => ({
						id: generateUlid(),
						talentId: talent.id,
						languageId: l.languageId,
						proficiency: l.proficiency,
					})),
				});
			}
		});
	}

	async function upsertJobByEmployerAndTitle({
		employerId,
		title,
		description,
		location,
		jobType,
		experienceLevel,
		salary,
		requiredSkills,
		requiredLanguages,
	}) {
		const existing = await prisma.job.findFirst({
			where: { employerId, title },
			select: { id: true },
		});

		if (!existing) {
			const created = await prisma.job.create({
				data: {
					id: generateUlid(),
					employerId,
					title,
					description,
					location,
					jobType,
					experienceLevel,
					salary,
					requiredSkills: requiredSkills.length
						? {
							create: requiredSkills.map((s) => ({
								id: generateUlid(),
								skillId: s.skillId,
								required: s.required,
							})),
						}
						: undefined,
					requiredLanguages: requiredLanguages.length
						? {
							create: requiredLanguages.map((l) => ({
								id: generateUlid(),
								languageId: l.languageId,
								minimumProficiency: l.minimumProficiency,
								required: l.required,
							})),
						}
						: undefined,
				},
				select: { id: true },
			});
			return created.id;
		}

		await prisma.$transaction(async (tx) => {
			await tx.job.update({
				where: { id: existing.id },
				data: {
					title,
					description,
					location,
					jobType,
					experienceLevel,
					salary,
				},
			});

			await tx.jobSkill.deleteMany({ where: { jobId: existing.id } });
			await tx.jobLanguage.deleteMany({ where: { jobId: existing.id } });

			if (requiredSkills.length > 0) {
				await tx.jobSkill.createMany({
					data: requiredSkills.map((s) => ({
						id: generateUlid(),
						jobId: existing.id,
						skillId: s.skillId,
						required: s.required,
					})),
				});
			}

			if (requiredLanguages.length > 0) {
				await tx.jobLanguage.createMany({
					data: requiredLanguages.map((l) => ({
						id: generateUlid(),
						jobId: existing.id,
						languageId: l.languageId,
						minimumProficiency: l.minimumProficiency,
						required: l.required,
					})),
				});
			}
		});

		return existing.id;
	}

	async function seedModerator() {
		const isProd = process.env.NODE_ENV === "production";
		const email =
			process.env.MODERATOR_EMAIL || (isProd ? undefined : "moderator@hirelink.com");
		const password =
			process.env.MODERATOR_PASSWORD || (isProd ? undefined : "p@ssword");
		if (!email || !password) {
			console.log("MODERATOR_EMAIL/MODERATOR_PASSWORD not set. Skipping moderator seed.");
			return;
		}

		const existing = await prisma.user.findUnique({
			where: { email },
			select: { id: true, role: true },
		});

		if (existing && existing.role !== "MODERATOR") {
			throw new Error(
				`Cannot seed moderator: user with email ${email} exists with role ${existing.role}`,
			);
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		await prisma.user.upsert({
			where: { email },
			create: {
				id: generateUlid(),
				email,
				password: hashedPassword,
				role: "MODERATOR",
				isActive: true,
				isEmailVerified: true,
				verificationToken: null,
				verificationExpiresAt: null,
			},
			update: {
				password: hashedPassword,
				role: "MODERATOR",
				isActive: true,
				isEmailVerified: true,
				verificationToken: null,
				verificationExpiresAt: null,
			},
		});
		console.log(`Seeded/updated moderator user: ${email}`);
	}

	await seedModerator();
	await backfillNormalizedNames();

	const skillNames = [
		"Node.js",
		"JavaScript",
		"TypeScript",
		"PostgreSQL",
		"Prisma",
		"React",
	];
	const languageNames = ["English", "Arabic", "French"];

	const skills = await Promise.all(skillNames.map(upsertSkill));
	const languages = await Promise.all(languageNames.map(upsertLanguage));

	const skillByName = new Map(skills.map((s) => [s.name, s]));
	const languageByName = new Map(languages.map((l) => [l.name, l]));

	function requireSkill(name) {
		const skill = skillByName.get(name);
		if (!skill) {
			throw new Error(`Seed invariant failed: missing skill '${name}'`);
		}
		return skill;
	}

	function requireLanguage(name) {
		const language = languageByName.get(name);
		if (!language) {
			throw new Error(`Seed invariant failed: missing language '${name}'`);
		}
		return language;
	}

	const talent1 = await upsertUserWithRole({
		email: seedTalentEmail,
		password: seedPassword,
		role: "TALENT",
		profileData: {
			firstName: "Talent",
			lastName: "One",
			headline: "Backend Developer",
			location: "Remote",
		},
	});

	const talent2 = await upsertUserWithRole({
		email: seedTalent2Email,
		password: seedPassword,
		role: "TALENT",
		profileData: {
			firstName: "Talent",
			lastName: "Two",
			headline: "Frontend Developer",
			location: "Remote",
		},
	});

	const employer1 = await upsertUserWithRole({
		email: seedEmployerEmail,
		password: seedPassword,
		role: "EMPLOYER",
		profileData: {
			companyName: "HireLink Demo Co",
			website: "https://hirelink.com",
			description: "Demo employer for local testing",
			location: "Remote",
		},
	});

	const employer2 = await upsertUserWithRole({
		email: seedEmployer2Email,
		password: seedPassword,
		role: "EMPLOYER",
		profileData: {
			companyName: "Second Demo Co",
			website: "https://example.com",
			description: "Another demo employer for local testing",
			location: "Remote",
		},
	});

	await setTalentSkillsAndLanguages({
		talentUserId: talent1.id,
		skills: [
			{ skillId: requireSkill("Node.js").id, level: "INTERMEDIATE" },
			{ skillId: requireSkill("PostgreSQL").id, level: "INTERMEDIATE" },
			{ skillId: requireSkill("Prisma").id, level: "INTERMEDIATE" },
		],
		languages: [
			{ languageId: requireLanguage("English").id, proficiency: "ADVANCED" },
			{ languageId: requireLanguage("Arabic").id, proficiency: "NATIVE" },
		],
	});

	await setTalentSkillsAndLanguages({
		talentUserId: talent2.id,
		skills: [
			{ skillId: requireSkill("React").id, level: "INTERMEDIATE" },
			{ skillId: requireSkill("TypeScript").id, level: "INTERMEDIATE" },
		],
		languages: [{ languageId: requireLanguage("English").id, proficiency: "ADVANCED" }],
	});

	const employerProfile1 = await prisma.employer.findUnique({
		where: { userId: employer1.id },
		select: { id: true },
	});
	const employerProfile2 = await prisma.employer.findUnique({
		where: { userId: employer2.id },
		select: { id: true },
	});

	const backendJobId = await upsertJobByEmployerAndTitle({
		employerId: employerProfile1.id,
		title: "Backend Engineer",
		description: "Build APIs and maintain them",
		location: "Remote",
		jobType: "FULL_TIME",
		experienceLevel: "JUNIOR",
		salary: 3000,
		requiredSkills: [
			{ skillId: requireSkill("Node.js").id, required: true },
			{ skillId: requireSkill("PostgreSQL").id, required: true },
			{ skillId: requireSkill("Prisma").id, required: false },
		],
		requiredLanguages: [
			{
				languageId: requireLanguage("English").id,
				minimumProficiency: "BASIC",
				required: true,
			},
		],
	});

	await upsertJobByEmployerAndTitle({
		employerId: employerProfile1.id,
		title: "Frontend Engineer",
		description: "Build great UI experiences",
		location: "Remote",
		jobType: "FULL_TIME",
		experienceLevel: "JUNIOR",
		salary: 2800,
		requiredSkills: [
			{ skillId: requireSkill("React").id, required: true },
			{ skillId: requireSkill("TypeScript").id, required: false },
		],
		requiredLanguages: [
			{
				languageId: requireLanguage("English").id,
				minimumProficiency: "BASIC",
				required: true,
			},
		],
	});

	await upsertJobByEmployerAndTitle({
		employerId: employerProfile2.id,
		title: "Fullstack Engineer",
		description: "Work across backend and frontend",
		location: "Remote",
		jobType: "FULL_TIME",
		experienceLevel: "SENIOR",
		salary: 4500,
		requiredSkills: [
			{ skillId: requireSkill("Node.js").id, required: true },
			{ skillId: requireSkill("React").id, required: true },
			{ skillId: requireSkill("PostgreSQL").id, required: false },
		],
		requiredLanguages: [
			{
				languageId: requireLanguage("English").id,
				minimumProficiency: "BASIC",
				required: true,
			},
			{
				languageId: requireLanguage("French").id,
				minimumProficiency: "BASIC",
				required: false,
			},
		],
	});

	const talentProfile1 = await prisma.talent.findUnique({
		where: { userId: talent1.id },
		select: { id: true },
	});
	const talentProfile2 = await prisma.talent.findUnique({
		where: { userId: talent2.id },
		select: { id: true },
	});

	await prisma.application.upsert({
		where: { jobId_talentId: { jobId: backendJobId, talentId: talentProfile1.id } },
		create: {
			id: generateUlid(),
			jobId: backendJobId,
			talentId: talentProfile1.id,
			coverLetter: "Hello, I would like to apply.",
			resumeUrl: null,
		},
		update: {
			coverLetter: "Hello, I would like to apply.",
		},
	});

	await prisma.application.upsert({
		where: { jobId_talentId: { jobId: backendJobId, talentId: talentProfile2.id } },
		create: {
			id: generateUlid(),
			jobId: backendJobId,
			talentId: talentProfile2.id,
			coverLetter: "Applying for practice.",
			resumeUrl: null,
		},
		update: {
			coverLetter: "Applying for practice.",
		},
	});

	console.log("Seeded dev dataset:");
	console.log(`- talents: ${talent1.email}, ${talent2.email} (password: ${seedPassword})`);
	console.log(`- employers: ${employer1.email}, ${employer2.email} (password: ${seedPassword})`);
}

main()
	.catch((err) => {
		console.error(err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
