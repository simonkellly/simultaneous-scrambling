export async function hashScramble(scramble: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(scramble);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return hashHex;
}

export async function validateScramble(
	scramble: string,
	expectedHash: string,
): Promise<boolean> {
	const actualHash = await hashScramble(scramble);
	return actualHash === expectedHash;
}

export async function generateScrambleHashes(wave: {
	waveNumber: number;
	groups: Array<{
		eventId: string;
		roundId: string;
		groupNumber: number;
		scrambles: string[];
		extraScrambles?: string[];
	}>;
}): Promise<Record<string, string>> {
	const hashes: Record<string, string> = {};

	for (const group of wave.groups) {
		for (let i = 0; i < group.scrambles.length; i++) {
			const scramble = group.scrambles[i];
			const key = `${group.eventId}-${group.groupNumber}-${i}`;
			hashes[key] = await hashScramble(scramble as string);
		}

		if (group.extraScrambles) {
			for (let i = 0; i < group.extraScrambles.length; i++) {
				const scramble = group.extraScrambles[i];
				const key = `${group.eventId}-${group.groupNumber}-${i === 0 ? "E1" : "E2"}`;
				hashes[key] = await hashScramble(scramble as string);
			}
		}
	}

	return hashes;
}
