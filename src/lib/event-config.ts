type PuzzleType =
	| "3x3x3"
	| "2x2x2"
	| "4x4x4"
	| "5x5x5"
	| "6x6x6"
	| "7x7x7"
	| "clock"
	| "megaminx"
	| "pyraminx"
	| "skewb"
	| "square1";

export function getPuzzleType(eventId: string): PuzzleType {
	const puzzleMap: Record<string, PuzzleType> = {
		"333": "3x3x3",
		"222": "2x2x2",
		"444": "4x4x4",
		"555": "5x5x5",
		"666": "6x6x6",
		"777": "7x7x7",
		"333bf": "3x3x3",
		"333fm": "3x3x3",
		"333oh": "3x3x3",
		clock: "clock",
		minx: "megaminx",
		pyram: "pyraminx",
		skewb: "skewb",
		sq1: "square1",
	};
	return puzzleMap[eventId] || "3x3x3";
}

export function formatEventName(eventId: string): string {
	const eventMap: Record<string, string> = {
		"333": "3x3x3",
		"222": "2x2x2",
		"444": "4x4x4",
		"555": "5x5x5",
		"666": "6x6x6",
		"777": "7x7x7",
		"333bf": "3x3x3 Blindfolded",
		"333fm": "3x3x3 Fewest Moves",
		"333oh": "3x3x3 One-Handed",
		clock: "Clock",
		minx: "Megaminx",
		pyram: "Pyraminx",
		skewb: "Skewb",
		sq1: "Square-1",
	};
	return eventMap[eventId] || eventId.toUpperCase();
}

export function getMaxLineLength(eventId: string): number {
	const maxLineLengthMap: Record<string, number> = {
		"333": 9,
		"222": 11,
		"444": 9,
		"555": 11,
		"666": 11,
		"777": 11,
		"333bf": 9,
		"333fm": 9,
		"333oh": 9,
		clock: 5,
		minx: 11,
		pyram: 11,
		skewb: 11,
		sq1: 5,
	};
	return maxLineLengthMap[eventId] || 11;
}

export function shouldUseSingleLineMode(eventId: string): boolean {
	const singleLineEvents = ["222", "pyram", "skewb"];
	return singleLineEvents.includes(eventId);
}
