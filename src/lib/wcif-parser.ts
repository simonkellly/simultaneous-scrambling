import type { Competition } from "@wca/helpers";

export interface ParsedWCIF {
	competition: Competition;
	competitionName: string;
}

export function parseWCIF(wcifData: unknown): ParsedWCIF {
	if (typeof wcifData !== "object" || wcifData === null) {
		throw new Error("Invalid WCIF data: must be an object");
	}

	const data = wcifData as Record<string, unknown>;

	let wcif: Competition;
	if (data.wcif) {
		wcif = data.wcif as Competition;
	} else {
		wcif = data as unknown as Competition;
	}

	if (!wcif.events || !Array.isArray(wcif.events)) {
		throw new Error("Invalid WCIF data: events must be an array");
	}

	const competitionName =
		typeof data.competitionName === "string"
			? data.competitionName
			: typeof wcif.name === "string"
				? wcif.name
				: "Unknown Competition";

	return {
		competition: wcif,
		competitionName,
	};
}

export function getAvailableEvents(wcif: Competition): string[] {
	return wcif.events.map((event) => event.id);
}
