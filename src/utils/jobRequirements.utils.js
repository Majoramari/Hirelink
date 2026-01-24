import {
	normalizeDisplayName,
	normalizedNameKey,
} from "./nameNormalization.utils.js";

export function flattenJob(job) {
	if (!job) {
		return job;
	}
	const { requiredSkills, requiredLanguages, ...rest } = job;
	return {
		...rest,
		requiredSkills: (requiredSkills || []).map((s) => ({
			skillId: s.skillId,
			name: s.skill?.name ?? null,
			required: s.required,
		})),
		requiredLanguages: (requiredLanguages || []).map((l) => ({
			languageId: l.languageId,
			name: l.language?.name ?? null,
			required: l.required,
			minimumProficiency: l.minimumProficiency ?? null,
		})),
	};
}

export function flattenJobs(jobs) {
	return (jobs || []).map(flattenJob);
}

export function normalizeRequiredSkillInput(requiredSkills) {
	const unique = new Map();
	for (const s of requiredSkills || []) {
		if (s?.skillId) {
			const key = `id:${s.skillId}`;
			if (!unique.has(key)) {
				unique.set(key, { skillId: s.skillId, required: s.required ?? true });
			}
			continue;
		}

		const name = normalizeDisplayName(s?.name);
		const normalizedName = normalizedNameKey(name);
		if (!name || !normalizedName) {
			return { ok: false };
		}
		if (!unique.has(normalizedName)) {
			unique.set(normalizedName, {
				name,
				normalizedName,
				required: s?.required ?? true,
			});
		}
	}
	return { ok: true, items: Array.from(unique.values()) };
}

export function normalizeRequiredLanguageInput(requiredLanguages) {
	const unique = new Map();
	for (const l of requiredLanguages || []) {
		if (l?.languageId) {
			const key = `id:${l.languageId}`;
			if (!unique.has(key)) {
				unique.set(key, {
					languageId: l.languageId,
					minimumProficiency: l.minimumProficiency,
					required: l.required ?? true,
				});
			}
			continue;
		}

		const name = normalizeDisplayName(l?.name);
		const normalizedName = normalizedNameKey(name);
		if (!name || !normalizedName) {
			return { ok: false };
		}
		if (!unique.has(normalizedName)) {
			unique.set(normalizedName, {
				name,
				normalizedName,
				required: l?.required ?? true,
				minimumProficiency: l?.minimumProficiency,
			});
		}
	}
	return { ok: true, items: Array.from(unique.values()) };
}
