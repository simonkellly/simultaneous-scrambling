import {
	ChevronDown,
	ChevronRight,
	Copy,
	Home,
	Pencil,
	RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { encryptWave, generateHash, generatePassword } from "@/lib/encryption";
import { formatEventName } from "@/lib/event-config";
import { generateScrambleHashes } from "@/lib/validation";
import {
	detectSimultaneousEvents,
	getScrambleSetInfos,
	groupIntoWavesWithOverrides,
} from "@/lib/wave-grouping";
import { getAvailableEvents, parseWCIF } from "@/lib/wcif-parser";

interface EncrypterProps {
	onSwitchToViewer?: () => void;
}

export function Encrypter({ onSwitchToViewer }: EncrypterProps) {
	const [parsedWCIF, setParsedWCIF] = useState<ReturnType<
		typeof parseWCIF
	> | null>(null);
	const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
	const [autoDetectedEvents, setAutoDetectedEvents] = useState<Set<string>>(
		new Set(),
	);
	const [wavePasswords, setWavePasswords] = useState<Map<number, string>>(
		new Map(),
	);
	const [title, setTitle] = useState("");
	const [processing, setProcessing] = useState(false);
	const [error, setError] = useState("");
	const [hashDialogOpen, setHashDialogOpen] = useState(false);
	const [generatedHash, setGeneratedHash] = useState("");

	const [waveAssignments, setWaveAssignments] = useState<Map<number, number>>(
		new Map(),
	);
	const [isEditingWaves, setIsEditingWaves] = useState(false);
	const [wavePreviewExpanded, setWavePreviewExpanded] = useState(true);

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const data = JSON.parse(text);
			const parsed = parseWCIF(data);
			setParsedWCIF(parsed);
			setTitle(parsed.competitionName);

			const simultaneousEvents = detectSimultaneousEvents(parsed.competition);
			setAutoDetectedEvents(simultaneousEvents);
			setSelectedEvents(simultaneousEvents);
			setWavePasswords(new Map());
			setWaveAssignments(new Map());
			setError("");
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to parse WCIF file",
			);
		}
	};

	const toggleEvent = (eventId: string) => {
		const newSelected = new Set(selectedEvents);
		if (newSelected.has(eventId)) {
			newSelected.delete(eventId);
		} else {
			newSelected.add(eventId);
		}
		setSelectedEvents(newSelected);

		setWavePasswords(new Map());
		setWaveAssignments(new Map());
	};

	const scrambleSetInfos = useMemo(() => {
		if (!parsedWCIF || selectedEvents.size === 0) return [];
		return getScrambleSetInfos(
			Array.from(selectedEvents),
			parsedWCIF.competition,
		);
	}, [parsedWCIF, selectedEvents]);

	const effectiveAssignments = useMemo(() => {
		const assignments = new Map<number, number>();
		for (const info of scrambleSetInfos) {
			const overrideWave = waveAssignments.get(info.scrambleSetId);
			if (overrideWave !== undefined) {
				assignments.set(info.scrambleSetId, overrideWave);
			} else {
				assignments.set(info.scrambleSetId, info.assignedWaveNumber);
			}
		}
		return assignments;
	}, [scrambleSetInfos, waveAssignments]);

	const waves = useMemo(() => {
		if (!parsedWCIF || selectedEvents.size === 0) return [];
		return groupIntoWavesWithOverrides(
			Array.from(selectedEvents),
			parsedWCIF.competition,
			effectiveAssignments,
		);
	}, [parsedWCIF, selectedEvents, effectiveAssignments]);

	const hasManualOverrides = waveAssignments.size > 0;

	const resetWaveAssignments = () => {
		setWaveAssignments(new Map());
	};

	const updateWaveAssignment = (
		scrambleSetId: number,
		newWaveNumber: number,
	) => {
		const newAssignments = new Map(waveAssignments);
		const info = scrambleSetInfos.find(
			(s) => s.scrambleSetId === scrambleSetId,
		);
		if (info && newWaveNumber === info.assignedWaveNumber) {
			newAssignments.delete(scrambleSetId);
		} else {
			newAssignments.set(scrambleSetId, newWaveNumber);
		}
		setWaveAssignments(newAssignments);
	};

	useEffect(() => {
		if (waves.length === 0) return;

		setWavePasswords((prevPasswords) => {
			const newPasswords = new Map(prevPasswords);
			let hasNewPassword = false;

			waves.forEach((wave) => {
				if (!newPasswords.has(wave.waveNumber)) {
					newPasswords.set(wave.waveNumber, generatePassword());
					hasNewPassword = true;
				}
			});

			return hasNewPassword ? newPasswords : prevPasswords;
		});
	}, [waves]);

	const handleEncrypt = async () => {
		if (!parsedWCIF || waves.length === 0) return;

		setProcessing(true);
		setError("");

		try {
			const encryptedWaves = await Promise.all(
				waves.map(async (wave) => {
					const password = wavePasswords.get(wave.waveNumber);
					if (!password) {
						throw new Error(`No password for wave ${wave.waveNumber}`);
					}

					const scrambleHashes = await generateScrambleHashes(wave);
					const waveWithHashes = { ...wave, scrambleHashes };

					const { encryptedData, iv, salt } = await encryptWave(
						waveWithHashes,
						password,
					);

					return {
						waveNumber: wave.waveNumber,
						encryptedData,
						iv,
						salt,
					};
				}),
			);

			const scrambleData = {
				waves: encryptedWaves,
				metadata: {
					title: title.trim(),
					totalWaves: waves.length,
					events: Array.from(selectedEvents),
				},
			};

			const dataString = JSON.stringify(scrambleData, null, 2);
			const hash = await generateHash(dataString);

			setGeneratedHash(hash);
			setHashDialogOpen(true);

			const blob = new Blob([dataString], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "scramble-data.json";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Encryption failed");
		} finally {
			setProcessing(false);
		}
	};

	const availableEvents = parsedWCIF
		? getAvailableEvents(parsedWCIF.competition)
		: [];

	return (
		<div className="flex flex-col h-full w-full">
			<div className="border-b py-2 px-4 flex items-center justify-center shrink-0 bg-background z-10 relative">
				{onSwitchToViewer && (
					<Button
						variant="outline"
						size="sm"
						onClick={onSwitchToViewer}
						className="absolute left-4"
					>
						<Home className="h-4 w-4 mr-2" />
						Home
					</Button>
				)}
				<h1 className="text-lg font-bold">Scramble Encrypter</h1>
			</div>
			<div className="flex-1 overflow-auto">
				<div className="container mx-auto p-8 max-w-4xl">
					<Card>
						<CardHeader>
							<CardTitle>Scramble Encrypter</CardTitle>
							<CardDescription>
								Upload a WCIF file, select events, and generate encrypted
								scramble data
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="space-y-2">
								<Label htmlFor="wcif-file">Scramble JSON</Label>
								<Input
									id="wcif-file"
									type="file"
									accept=".json"
									onChange={handleFileUpload}
								/>
								{parsedWCIF && (
									<p className="text-sm text-muted-foreground">
										Loaded: {parsedWCIF.competitionName}
									</p>
								)}
							</div>

							{parsedWCIF && (
								<div className="space-y-2">
									<Label htmlFor="title">Title *</Label>
									<Input
										id="title"
										type="text"
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										placeholder="Enter a title for this scramble data"
										required
									/>
									<p className="text-sm text-muted-foreground">
										This title will be displayed when viewing scrambles
									</p>
								</div>
							)}

							{parsedWCIF && (
								<>
									<div className="space-y-2">
										<Label>Select Events</Label>
										{autoDetectedEvents.size > 0 && (
											<p className="text-sm text-muted-foreground">
												🤖 {autoDetectedEvents.size} simultaneous event
												{autoDetectedEvents.size > 1 ? "s" : ""} detected from
												schedule
											</p>
										)}
										<div className="space-y-2">
											{availableEvents.map((eventId) => (
												<div
													key={eventId}
													className="flex items-center space-x-2"
												>
													<Checkbox
														id={`event-${eventId}`}
														checked={selectedEvents.has(eventId)}
														onCheckedChange={() => toggleEvent(eventId)}
													/>
													<Label
														htmlFor={`event-${eventId}`}
														className="font-normal cursor-pointer"
													>
														{eventId}
														{autoDetectedEvents.has(eventId) && (
															<span className="ml-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
																auto-detected
															</span>
														)}
													</Label>
												</div>
											))}
										</div>
									</div>

									{waves.length > 0 && (
										<div className="space-y-4">
											{/* Wave Preview Section */}
											<div className="border rounded-lg">
												<button
													type="button"
													onClick={() =>
														setWavePreviewExpanded(!wavePreviewExpanded)
													}
													className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
												>
													<div className="flex items-center gap-2">
														{wavePreviewExpanded ? (
															<ChevronDown className="h-4 w-4 text-muted-foreground" />
														) : (
															<ChevronRight className="h-4 w-4 text-muted-foreground" />
														)}
														<Label className="cursor-pointer">
															Wave Assignments
														</Label>
														<span className="text-sm text-muted-foreground">
															({waves.length} wave{waves.length > 1 ? "s" : ""},{" "}
															{scrambleSetInfos.length} scramble set
															{scrambleSetInfos.length > 1 ? "s" : ""})
														</span>
													</div>
													<div className="flex items-center gap-2">
														{hasManualOverrides && (
															<span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded border border-accent/30">
																Modified
															</span>
														)}
														<Button
															variant="ghost"
															size="sm"
															onClick={(e) => {
																e.stopPropagation();
																setIsEditingWaves(!isEditingWaves);
															}}
															className="h-7 px-2"
														>
															<Pencil className="h-3 w-3 mr-1" />
															{isEditingWaves ? "Done" : "Edit"}
														</Button>
														{hasManualOverrides && (
															<Button
																variant="ghost"
																size="sm"
																onClick={(e) => {
																	e.stopPropagation();
																	resetWaveAssignments();
																}}
																className="h-7 px-2"
															>
																<RotateCcw className="h-3 w-3 mr-1" />
																Reset
															</Button>
														)}
													</div>
												</button>

												{wavePreviewExpanded && (
													<div className="border-t p-3 space-y-3">
														{waves.map((wave) => (
															<div key={wave.waveNumber} className="space-y-2">
																<div className="flex items-center gap-2">
																	<span className="font-medium text-sm bg-primary/10 text-primary px-2 py-0.5 rounded">
																		Wave {wave.waveNumber}
																	</span>
																	<span className="text-xs text-muted-foreground">
																		{wave.groups.length} event
																		{wave.groups.length > 1 ? "s" : ""}
																	</span>
																</div>
																<div className="ml-4 flex flex-wrap gap-2">
																	{wave.groups.map((group) => {
																		const info = scrambleSetInfos.find(
																			(s) =>
																				s.scrambleSetId === group.scrambleSetId,
																		);
																		const isOverridden =
																			info &&
																			waveAssignments.has(info.scrambleSetId);

																		return (
																			<div
																				key={`${group.eventId}-${group.roundId}-${group.groupNumber}`}
																				className={`flex items-center gap-2 text-sm px-2 py-1 rounded border ${
																					isOverridden
																						? "bg-accent/20 border-accent/50 text-foreground"
																						: "bg-muted/50 border-border"
																				}`}
																			>
																				<span className="font-medium text-foreground">
																					{formatEventName(group.eventId)}
																				</span>
																				<span className="text-muted-foreground text-xs">
																					{group.roundId.includes("-r")
																						? `R${group.roundId.split("-r")[1]}`
																						: ""}{" "}
																					G{group.groupNumber}
																				</span>
																				<span className="text-muted-foreground text-xs">
																					({group.scrambles.length} scrambles)
																				</span>
																				{isEditingWaves && info && (
																					<select
																						value={
																							effectiveAssignments.get(
																								info.scrambleSetId,
																							) || wave.waveNumber
																						}
																						onChange={(e) =>
																							updateWaveAssignment(
																								info.scrambleSetId,
																								Number(e.target.value),
																							)
																						}
																						onClick={(e) => e.stopPropagation()}
																						className="ml-1 text-xs border border-border rounded px-1 py-0.5 bg-card text-foreground"
																					>
																						{Array.from(
																							{
																								length: Math.max(
																									...Array.from(
																										effectiveAssignments.values(),
																									),
																									5,
																								),
																							},
																							(_, i) => i + 1,
																						).map((num) => (
																							<option key={num} value={num}>
																								Wave {num}
																							</option>
																						))}
																					</select>
																				)}
																			</div>
																		);
																	})}
																</div>
															</div>
														))}

														{isEditingWaves && (
															<p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
																💡 Use the dropdowns to reassign scramble sets
																to different waves.
																{!hasManualOverrides &&
																	" Assignments are auto-detected from the schedule."}
															</p>
														)}
													</div>
												)}
											</div>

											{/* Wave Passwords Section */}
											<div>
												<div className="flex items-center justify-between mb-2">
													<div>
														<Label>Wave Passwords</Label>
														<p className="text-sm text-muted-foreground">
															{waves.length} wave(s) will be created. Passwords
															are auto-generated but can be edited.
														</p>
													</div>
													<Button
														variant="outline"
														size="sm"
														onClick={() => {
															const passwordText = waves
																.map((wave) => {
																	const pwd =
																		wavePasswords.get(wave.waveNumber) || "";
																	return `Wave ${wave.waveNumber}: ${pwd}`;
																})
																.join("\n");
															navigator.clipboard.writeText(passwordText);
														}}
													>
														Copy All Passwords
													</Button>
												</div>
												<div className="space-y-2">
													{waves.map((wave) => (
														<div
															key={wave.waveNumber}
															className="flex items-center gap-2"
														>
															<Label className="w-20">
																Wave {wave.waveNumber}:
															</Label>
															<Input
																value={wavePasswords.get(wave.waveNumber) || ""}
																onChange={(e) => {
																	const newPasswords = new Map(wavePasswords);
																	newPasswords.set(
																		wave.waveNumber,
																		e.target.value,
																	);
																	setWavePasswords(newPasswords);
																}}
																maxLength={12}
																pattern="[a-z0-9]{12}"
																placeholder="12 characters (a-z0-9)"
																className="flex-1"
															/>
															<Button
																variant="outline"
																size="sm"
																onClick={() => {
																	const newPasswords = new Map(wavePasswords);
																	newPasswords.set(
																		wave.waveNumber,
																		generatePassword(),
																	);
																	setWavePasswords(newPasswords);
																}}
															>
																Generate
															</Button>
														</div>
													))}
												</div>
											</div>

											<Button
												onClick={handleEncrypt}
												disabled={
													processing ||
													!title.trim() ||
													waves.some((w) => {
														const pwd = wavePasswords.get(w.waveNumber);
														return !pwd || pwd.length !== 12;
													})
												}
												className="w-full"
											>
												{processing ? "Encrypting..." : "Encrypt and Download"}
											</Button>
										</div>
									)}
								</>
							)}

							{error && (
								<div className="p-4 bg-destructive/10 text-destructive rounded-md">
									{error}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			<Dialog open={hashDialogOpen} onOpenChange={setHashDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>File Hash</DialogTitle>
						<DialogDescription>
							Copy this hash to verify file integrity. The hash is computed from
							the file contents.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="p-3 bg-muted rounded-md">
							<code className="text-sm break-all font-mono">
								{generatedHash}
							</code>
						</div>
						<Button
							variant="outline"
							onClick={() => {
								navigator.clipboard.writeText(generatedHash);
							}}
							className="w-full"
						>
							<Copy className="h-4 w-4 mr-2" />
							Copy Hash
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
