export function stringSimilarity(sourceValue, targetValue) {
	const source = String(sourceValue || "");
	const target = String(targetValue || "");
	if (!source || !target) {
		return 0;
	}
	if (source === target) {
		return 1;
	}

	const maxLen = Math.max(source.length, target.length);
	if (maxLen === 0) {
		return 1;
	}

	const editDistanceMatrix = Array.from(
		{ length: source.length + 1 },
		() => new Array(target.length + 1),
	);
	for (let sourceIndex = 0; sourceIndex <= source.length; sourceIndex += 1) {
		editDistanceMatrix[sourceIndex][0] = sourceIndex;
	}
	for (let targetIndex = 0; targetIndex <= target.length; targetIndex += 1) {
		editDistanceMatrix[0][targetIndex] = targetIndex;
	}

	for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
		for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
			const substitutionCost =
				source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1;
			editDistanceMatrix[sourceIndex][targetIndex] = Math.min(
				editDistanceMatrix[sourceIndex - 1][targetIndex] + 1,
				editDistanceMatrix[sourceIndex][targetIndex - 1] + 1,
				editDistanceMatrix[sourceIndex - 1][targetIndex - 1] + substitutionCost,
			);
		}
	}

	const editDistance = editDistanceMatrix[source.length][target.length];
	return 1 - editDistance / maxLen;
}
