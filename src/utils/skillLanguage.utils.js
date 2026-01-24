import errorUtils from "./error.utils.js";
import { pickBestFuzzyMatch } from "./fuzzyMatch.utils.js";
import { normalizedNameKey } from "./nameNormalization.utils.js";

export async function findFuzzySkill(tx, normalizedKey) {
	const prefixLen = Math.min(3, normalizedKey.length);
	const prefix = normalizedKey.slice(0, prefixLen);
	if (!prefix) {
		return null;
	}

	const candidates = await tx.skill.findMany({
		where: {
			OR: [
				{ normalizedName: { startsWith: prefix } },
				{ name: { startsWith: prefix, mode: "insensitive" } },
			],
		},
		take: 50,
		select: { id: true, name: true, normalizedName: true },
	});

	return pickBestFuzzyMatch({
		targetKey: normalizedKey,
		candidates,
		getCandidateKey: (c) => c.normalizedName || normalizedNameKey(c.name),
		threshold: 0.9,
	});
}

export async function findFuzzyLanguage(tx, normalizedKey) {
	const prefixLen = Math.min(3, normalizedKey.length);
	const prefix = normalizedKey.slice(0, prefixLen);
	if (!prefix) {
		return null;
	}

	const candidates = await tx.language.findMany({
		where: {
			OR: [
				{ normalizedName: { startsWith: prefix } },
				{ name: { startsWith: prefix, mode: "insensitive" } },
			],
		},
		take: 50,
		select: { id: true, name: true, normalizedName: true },
	});

	return pickBestFuzzyMatch({
		targetKey: normalizedKey,
		candidates,
		getCandidateKey: (c) => c.normalizedName || normalizedNameKey(c.name),
		threshold: 0.9,
	});
}

export async function getOrCreateSkillByNormalizedName(
	tx,
	{ name, normalizedName },
	{ generateId },
) {
	if (normalizedName) {
		const byNormalized = await tx.skill.findFirst({
			where: { normalizedName },
			select: { id: true, name: true, normalizedName: true },
		});
		if (byNormalized) {
			return byNormalized;
		}
	}

	const byName = await tx.skill.findFirst({
		where: { name: { equals: name, mode: "insensitive" } },
		select: { id: true, name: true, normalizedName: true },
	});
	if (byName) {
		if (byName.normalizedName == null && normalizedName) {
			const [error, updated] = await errorUtils(
				tx.skill.update({
					where: { id: byName.id },
					data: { normalizedName },
					select: { id: true, name: true, normalizedName: true },
				}),
			);
			if (!error && updated) {
				return updated;
			}
			const canonical = await tx.skill.findFirst({
				where: { normalizedName },
				select: { id: true, name: true, normalizedName: true },
			});
			if (canonical) {
				return canonical;
			}
		}
		return byName;
	}

	const fuzzy = normalizedName
		? await findFuzzySkill(tx, normalizedName)
		: null;
	if (fuzzy) {
		if (fuzzy.normalizedName == null && normalizedName) {
			const [error, updated] = await errorUtils(
				tx.skill.update({
					where: { id: fuzzy.id },
					data: { normalizedName },
					select: { id: true, name: true, normalizedName: true },
				}),
			);
			if (!error && updated) {
				return updated;
			}
			const canonical = await tx.skill.findFirst({
				where: { normalizedName },
				select: { id: true, name: true, normalizedName: true },
			});
			if (canonical) {
				return canonical;
			}
		}
		return fuzzy;
	}

	return tx.skill.create({
		data: {
			id: generateId(),
			name,
			normalizedName: normalizedName || null,
		},
		select: { id: true, name: true, normalizedName: true },
	});
}

export async function getOrCreateLanguageByNormalizedName(
	tx,
	{ name, normalizedName },
	{ generateId },
) {
	if (normalizedName) {
		const byNormalized = await tx.language.findFirst({
			where: { normalizedName },
			select: { id: true, name: true, normalizedName: true },
		});
		if (byNormalized) {
			return byNormalized;
		}
	}

	const byName = await tx.language.findFirst({
		where: { name: { equals: name, mode: "insensitive" } },
		select: { id: true, name: true, normalizedName: true },
	});
	if (byName) {
		if (byName.normalizedName == null && normalizedName) {
			const [error, updated] = await errorUtils(
				tx.language.update({
					where: { id: byName.id },
					data: { normalizedName },
					select: { id: true, name: true, normalizedName: true },
				}),
			);
			if (!error && updated) {
				return updated;
			}
			const canonical = await tx.language.findFirst({
				where: { normalizedName },
				select: { id: true, name: true, normalizedName: true },
			});
			if (canonical) {
				return canonical;
			}
		}
		return byName;
	}

	const fuzzy = normalizedName
		? await findFuzzyLanguage(tx, normalizedName)
		: null;
	if (fuzzy) {
		if (fuzzy.normalizedName == null && normalizedName) {
			const [error, updated] = await errorUtils(
				tx.language.update({
					where: { id: fuzzy.id },
					data: { normalizedName },
					select: { id: true, name: true, normalizedName: true },
				}),
			);
			if (!error && updated) {
				return updated;
			}
			const canonical = await tx.language.findFirst({
				where: { normalizedName },
				select: { id: true, name: true, normalizedName: true },
			});
			if (canonical) {
				return canonical;
			}
		}
		return fuzzy;
	}

	return tx.language.create({
		data: {
			id: generateId(),
			name,
			normalizedName: normalizedName || null,
		},
		select: { id: true, name: true, normalizedName: true },
	});
}
