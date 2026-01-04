import type { Activity, Competition } from "@wca/helpers";

export interface WaveGroup {
	eventId: string;
	roundId: string;
	groupNumber: number;
	scrambles: string[];
	extraScrambles?: string[];
	scrambleSetId?: number;
}

export interface Wave {
	waveNumber: number;
	groups: WaveGroup[];
	scrambleHashes?: Record<string, string>;
}

export interface ScrambleSetInfo {
	scrambleSetId: number;
	eventId: string;
	roundId: string;
	scrambleCount: number;
	extraScrambleCount: number;
	scheduledGroupNumber: number | null;
	assignedWaveNumber: number;
	startTime: string | null;
}

interface ScheduleGroup {
	roundId: string;
	groupNumber: number;
	startTime: string;
}

function parseGroupNumber(activityCode: string): number | null {
	const match = activityCode.match(/-g(\d+)$/);
	return match ? Number.parseInt(match[1] ?? "", 10) : null;
}

function parseRoundId(activityCode: string): string {
	return activityCode.replace(/-g\d+$/, "");
}

function parseEventId(activityCode: string): string {
	return parseRoundId(activityCode)?.split("-")[0] ?? "";
}

function collectGroupsFromActivity(
	activity: Activity,
	groups: ScheduleGroup[],
) {
	for (const child of activity.childActivities ?? []) {
		const groupNumber = parseGroupNumber(child.activityCode);
		if (groupNumber != null && child.startTime) {
			groups.push({
				roundId: parseRoundId(child.activityCode),
				groupNumber,
				startTime: child.startTime,
			});
		}
		collectGroupsFromActivity(child, groups);
	}
}

function getScheduleGroups(competition: Competition): ScheduleGroup[] {
	const groups: ScheduleGroup[] = [];
	for (const venue of competition.schedule?.venues ?? []) {
		for (const room of venue.rooms ?? []) {
			for (const activity of room.activities ?? []) {
				collectGroupsFromActivity(activity, groups);
			}
		}
	}
	return groups;
}

function getRoundGroupsOrdered(
	roundId: string,
	scheduleGroups: ScheduleGroup[],
): { groupNumber: number; startTime: string }[] {
	return scheduleGroups
		.filter((g) => g.roundId === roundId)
		.sort((a, b) => a.groupNumber - b.groupNumber)
		.map(({ groupNumber, startTime }) => ({ groupNumber, startTime }));
}

function buildTimeToWaveMap(
	selectedEventIds: string[],
	scheduleGroups: ScheduleGroup[],
): Map<string, number> {
	const startTimes = new Set<string>();
	for (const group of scheduleGroups) {
		if (selectedEventIds.includes(parseEventId(group.roundId))) {
			startTimes.add(group.startTime);
		}
	}

	const timeToWave = new Map<string, number>();
	Array.from(startTimes)
		.sort()
		.forEach((time, index) => {
			timeToWave.set(time, index + 1);
		});

	return timeToWave;
}

function extractScrambleStrings(scrambles: unknown[]): string[] {
	return scrambles.map((s) =>
		typeof s === "string"
			? s
			: (s as { scramble: string }).scramble || String(s),
	);
}

function buildWavesFromMap(groupsByWave: Map<number, WaveGroup[]>): Wave[] {
	const waveNumbers = Array.from(groupsByWave.keys());
	if (waveNumbers.length === 0) return [];

	const maxWave = Math.max(...waveNumbers);
	const waves: Wave[] = [];

	for (let num = 1; num <= maxWave; num++) {
		const groups = groupsByWave.get(num);
		if (groups?.length) {
			waves.push({ waveNumber: num, groups });
		}
	}
	return waves;
}

export function detectSimultaneousEvents(
	competition: Competition,
): Set<string> {
	const startTimeToEvents = new Map<string, Set<string>>();

	for (const venue of competition.schedule?.venues ?? []) {
		for (const room of venue.rooms ?? []) {
			for (const activity of room.activities ?? []) {
				const eventId = parseEventId(activity.activityCode);
				if (eventId === "other" || !activity.startTime) continue;

				if (!startTimeToEvents.has(activity.startTime)) {
					startTimeToEvents.set(activity.startTime, new Set());
				}
				const eventsSet = startTimeToEvents.get(activity.startTime);
				if (eventsSet) {
					eventsSet.add(eventId);
				}
			}
		}
	}

	const simultaneousEvents = new Set<string>();
	for (const events of startTimeToEvents.values()) {
		if (events.size > 1) {
			for (const eventId of events) {
				simultaneousEvents.add(eventId);
			}
		}
	}
	return simultaneousEvents;
}

export function getScrambleSetInfos(
	selectedEventIds: string[],
	competition: Competition,
): ScrambleSetInfo[] {
	const scheduleGroups = getScheduleGroups(competition);
	const timeToWave = buildTimeToWaveMap(selectedEventIds, scheduleGroups);
	const infos: ScrambleSetInfo[] = [];

	for (const event of competition.events) {
		if (!selectedEventIds.includes(event.id)) continue;

		for (const round of event.rounds) {
			if (!round.scrambleSets) continue;

			const roundGroups = getRoundGroupsOrdered(round.id, scheduleGroups);

			round.scrambleSets.forEach((scrambleSet, index) => {
				const groupInfo = roundGroups[index];

				infos.push({
					scrambleSetId: scrambleSet.id,
					eventId: event.id,
					roundId: round.id,
					scrambleCount: scrambleSet.scrambles.length,
					extraScrambleCount: scrambleSet.extraScrambles?.length ?? 0,
					scheduledGroupNumber: groupInfo?.groupNumber ?? null,
					assignedWaveNumber: groupInfo
						? (timeToWave.get(groupInfo.startTime) ?? index + 1)
						: index + 1,
					startTime: groupInfo?.startTime ?? null,
				});
			});
		}
	}
	return infos;
}

export function groupIntoWavesWithOverrides(
	selectedEventIds: string[],
	competition: Competition,
	waveAssignments: Map<number, number>,
): Wave[] {
	if (selectedEventIds.length === 0) return [];

	const scheduleGroups = getScheduleGroups(competition);
	const timeToWave = buildTimeToWaveMap(selectedEventIds, scheduleGroups);
	const groupsByWave = new Map<number, WaveGroup[]>();

	for (const event of competition.events) {
		if (!selectedEventIds.includes(event.id)) continue;

		for (const round of event.rounds) {
			if (!round.scrambleSets) continue;

			const roundGroups = getRoundGroupsOrdered(round.id, scheduleGroups);

			round.scrambleSets.forEach((scrambleSet, index) => {
				const groupInfo = roundGroups[index];

				const waveNumber =
					waveAssignments.get(scrambleSet.id) ??
					(groupInfo ? timeToWave.get(groupInfo.startTime) : null) ??
					index + 1;

				if (!groupsByWave.has(waveNumber)) {
					groupsByWave.set(waveNumber, []);
				}

				const extraScrambles = scrambleSet.extraScrambles
					? extractScrambleStrings(scrambleSet.extraScrambles)
					: undefined;

				const waveGroups = groupsByWave.get(waveNumber);
				if (waveGroups) {
					waveGroups.push({
						eventId: event.id,
						roundId: round.id,
						groupNumber: groupInfo?.groupNumber ?? index + 1,
						scrambles: extractScrambleStrings(scrambleSet.scrambles),
						scrambleSetId: scrambleSet.id,
						...(extraScrambles?.length ? { extraScrambles } : {}),
					});
				}
			});
		}
	}

	return buildWavesFromMap(groupsByWave);
}

export function groupIntoWaves(
	selectedEventIds: string[],
	competition: Competition,
): Wave[] {
	return groupIntoWavesWithOverrides(selectedEventIds, competition, new Map());
}
