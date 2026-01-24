import { normalizedNameKey } from "./nameNormalization.utils.js";
import { stringSimilarity } from "./stringSimilarity.utils.js";

export function pickBestFuzzyMatch({
	targetKey,
	candidates,
	getCandidateKey,
	threshold = 0.9,
}) {
	let best = null;
	let bestScore = 0;

	for (const c of candidates || []) {
		const key = getCandidateKey
			? getCandidateKey(c)
			: c?.normalizedName || normalizedNameKey(c?.name);
		if (!key) {
			continue;
		}
		const score = stringSimilarity(targetKey, key);
		if (score > bestScore) {
			bestScore = score;
			best = c;
		}
	}

	if (best && bestScore >= threshold) {
		return best;
	}

	return null;
}
