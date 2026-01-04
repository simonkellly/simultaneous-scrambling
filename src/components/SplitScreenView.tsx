import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMaxLineLength } from "@/lib/event-config";
import type { Wave } from "@/lib/wave-grouping";
import {
	ScramblePanelControls,
	ScramblePanelCube,
	ScramblePanelText,
} from "./ScramblePanel";

interface SplitScreenViewProps {
	wave: Wave;
	title?: string;
}

interface PanelState {
	eventId: string | null;
	scrambleIndex: number | "E1" | "E2" | null;
}

interface AutoScaleTextProps {
	scramble: string;
	eventId: string;
	className?: string;
	minFontSize?: number;
	maxFontSize?: number;
	singleLineMode?: boolean;
}

function formatScramble(
	scramble: string,
	eventId: string,
	singleLine: boolean,
): string {
	const tokens = scramble.split(/\s+/).filter((m) => m.length > 0);
	if (tokens.length === 0) return scramble;

	const isSquare1 = eventId === "sq1";
	const moves = isSquare1 ? tokens.filter((t) => t !== "/") : tokens;
	if (moves.length === 0) return scramble;

	const maxMoveLength = Math.max(...moves.map((m) => m.length));
	const moveWidth = maxMoveLength + 1;

	const formattedTokens = tokens.map((token) =>
		token === "/" ? "/ " : token.padEnd(moveWidth),
	);

	if (singleLine) {
		return formattedTokens.join("").trimEnd();
	}

	const maxLineLength = getMaxLineLength(eventId);
	const lines: string[] = [];
	let currentLine: string[] = [];
	let moveCount = 0;

	for (const token of formattedTokens) {
		if (!isSquare1 || token.trim() !== "/") {
			if (moveCount > 0 && moveCount % maxLineLength === 0) {
				lines.push(currentLine.join("").trimEnd());
				currentLine = [];
			}
			moveCount++;
		}
		currentLine.push(token);
	}

	if (currentLine.length > 0) {
		lines.push(currentLine.join("").trimEnd());
	}

	return lines.join("\n");
}

function AutoScaleText({
	scramble,
	eventId,
	className = "",
	minFontSize = 12,
	maxFontSize = 64,
	singleLineMode = false,
}: AutoScaleTextProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const textRef = useRef<HTMLDivElement>(null);
	const measureRef = useRef<HTMLDivElement>(null);
	const [fontSize, setFontSize] = useState(maxFontSize);
	const [formattedText, setFormattedText] = useState("");

	useEffect(() => {
		const optimizeText = () => {
			if (!containerRef.current || !measureRef.current) return;

			const container = containerRef.current;
			const measureElement = measureRef.current;

			const padding = 20;
			const containerWidth = container.clientWidth - padding * 2;
			const containerHeight = container.clientHeight - padding * 2;

			if (containerWidth <= 0 || containerHeight <= 0) return;

			const formatted = formatScramble(scramble, eventId, singleLineMode);
			setFormattedText(formatted);

			const lineCount = formatted.split("\n").length;

			let initialFontSize: number;
			if (singleLineMode) {
				const totalLength = scramble.length;

				initialFontSize = Math.max(
					minFontSize,
					Math.min(maxFontSize, Math.floor(800 / totalLength)),
				);
			} else {
				initialFontSize = Math.max(
					minFontSize,
					Math.min(
						maxFontSize,
						Math.floor(containerHeight / (lineCount * 1.5)),
					),
				);
			}

			measureElement.textContent = formatted;

			let min = minFontSize;
			let max = Math.min(maxFontSize, initialFontSize * 2);
			let optimalSize = minFontSize;

			measureElement.style.fontSize = `${initialFontSize}px`;
			void measureElement.offsetHeight;
			const initialWidth = measureElement.scrollWidth;
			const initialHeight = measureElement.scrollHeight;

			if (initialWidth <= containerWidth && initialHeight <= containerHeight) {
				min = initialFontSize;
				max = maxFontSize;
			} else {
				max = initialFontSize;
			}

			while (min <= max) {
				const mid = Math.floor((min + max) / 2);
				measureElement.style.fontSize = `${mid}px`;
				void measureElement.offsetHeight;

				const currentWidth = measureElement.scrollWidth;
				const currentHeight = measureElement.scrollHeight;

				if (
					currentWidth <= containerWidth &&
					currentHeight <= containerHeight
				) {
					optimalSize = mid;
					min = mid + 1;
				} else {
					max = mid - 1;
				}
			}

			setFontSize(optimalSize);
		};

		const rafId = requestAnimationFrame(() => {
			optimizeText();
		});

		const resizeObserver = new ResizeObserver(() => {
			requestAnimationFrame(optimizeText);
		});

		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}

		const timeoutId = setTimeout(optimizeText, 100);

		return () => {
			cancelAnimationFrame(rafId);
			resizeObserver.disconnect();
			clearTimeout(timeoutId);
		};
	}, [scramble, eventId, minFontSize, maxFontSize, singleLineMode]);

	const lines = formattedText.split("\n");

	return (
		<div
			ref={containerRef}
			className="w-full h-full flex items-center justify-center"
			style={{ overflow: "hidden" }}
		>
			{}
			<div
				ref={measureRef}
				className={className}
				style={{
					position: "absolute",
					visibility: "hidden",
					whiteSpace: "pre",
					lineHeight: "1.45",
					padding: "0 4px",
				}}
			/>
			{}
			<div
				ref={textRef}
				className={className}
				style={{
					fontSize: `${fontSize}px`,
					lineHeight: "1.45",
					padding: "0 4px",
				}}
			>
				{lines.map((line, index) => (
					<div
						key={index + line}
						style={{
							backgroundColor:
								index % 2 === 0 ? "transparent" : "rgba(0, 0, 0, 0.125)",
							padding: "0 12px",
							whiteSpace: "pre",
						}}
					>
						{line}
					</div>
				))}
			</div>
		</div>
	);
}

export function SplitScreenView({ wave, title: _title }: SplitScreenViewProps) {
	const [leftPanel, setLeftPanel] = useState<PanelState>({
		eventId: null,
		scrambleIndex: null,
	});
	const [rightPanel, setRightPanel] = useState<PanelState>({
		eventId: null,
		scrambleIndex: null,
	});

	const events = Array.from(new Set(wave.groups.map((g) => g.eventId))).sort();

	const getScramblesForEvent = useCallback(
		(eventId: string): string[] => {
			const group = wave.groups.find((g) => g.eventId === eventId);
			return group?.scrambles || [];
		},
		[wave.groups],
	);

	const getExtraScramblesForEvent = useCallback(
		(eventId: string): string[] => {
			const group = wave.groups.find((g) => g.eventId === eventId);
			return group?.extraScrambles || [];
		},
		[wave.groups],
	);

	const leftScrambles = useMemo(
		() => (leftPanel.eventId ? getScramblesForEvent(leftPanel.eventId) : []),
		[leftPanel.eventId, getScramblesForEvent],
	);

	const rightScrambles = useMemo(
		() => (rightPanel.eventId ? getScramblesForEvent(rightPanel.eventId) : []),
		[rightPanel.eventId, getScramblesForEvent],
	);

	const leftExtraScrambles = useMemo(
		() =>
			leftPanel.eventId ? getExtraScramblesForEvent(leftPanel.eventId) : [],
		[leftPanel.eventId, getExtraScramblesForEvent],
	);

	const rightExtraScrambles = useMemo(
		() =>
			rightPanel.eventId ? getExtraScramblesForEvent(rightPanel.eventId) : [],
		[rightPanel.eventId, getExtraScramblesForEvent],
	);

	const leftSelectedScramble = useMemo(() => {
		if (!leftPanel.eventId || leftPanel.scrambleIndex === null) return null;
		if (leftPanel.scrambleIndex === "E1") {
			return leftExtraScrambles[0] || null;
		}
		if (leftPanel.scrambleIndex === "E2") {
			return leftExtraScrambles[1] || null;
		}
		if (typeof leftPanel.scrambleIndex === "number") {
			return leftScrambles[leftPanel.scrambleIndex] || null;
		}
		return null;
	}, [
		leftPanel.eventId,
		leftPanel.scrambleIndex,
		leftScrambles,
		leftExtraScrambles,
	]);

	const rightSelectedScramble = useMemo(() => {
		if (!rightPanel.eventId || rightPanel.scrambleIndex === null) return null;
		if (rightPanel.scrambleIndex === "E1") {
			return rightExtraScrambles[0] || null;
		}
		if (rightPanel.scrambleIndex === "E2") {
			return rightExtraScrambles[1] || null;
		}
		if (typeof rightPanel.scrambleIndex === "number") {
			return rightScrambles[rightPanel.scrambleIndex] || null;
		}
		return null;
	}, [
		rightPanel.eventId,
		rightPanel.scrambleIndex,
		rightScrambles,
		rightExtraScrambles,
	]);

	const handleLeftEventChange = useCallback((value: string) => {
		setLeftPanel({ eventId: value, scrambleIndex: null });
	}, []);

	const handleRightEventChange = useCallback((value: string) => {
		setRightPanel({ eventId: value, scrambleIndex: null });
	}, []);

	const handleLeftScrambleClick = useCallback((index: number | "E1" | "E2") => {
		setLeftPanel((prev) => ({ ...prev, scrambleIndex: index }));
	}, []);

	const handleRightScrambleClick = useCallback(
		(index: number | "E1" | "E2") => {
			setRightPanel((prev) => ({ ...prev, scrambleIndex: index }));
		},
		[],
	);

	return (
		<div className="flex flex-col h-full w-full">
			{}
			<div className="flex shrink-0 border-b" style={{ padding: "8px 12px" }}>
				<ScramblePanelControls
					panelState={leftPanel}
					events={events}
					scrambles={leftScrambles}
					extraScrambles={leftExtraScrambles}
					panelLabel="Left"
					onEventChange={handleLeftEventChange}
					onScrambleClick={handleLeftScrambleClick}
				/>
				<div className="border-l shrink-0" />
				<ScramblePanelControls
					panelState={rightPanel}
					events={events}
					scrambles={rightScrambles}
					extraScrambles={rightExtraScrambles}
					panelLabel="Right"
					onEventChange={handleRightEventChange}
					onScrambleClick={handleRightScrambleClick}
				/>
			</div>

			{}
			<div
				className="flex-1 flex shrink-0 min-h-0"
				style={{ padding: "0 16px" }}
			>
				<ScramblePanelText
					panelState={leftPanel}
					selectedScramble={leftSelectedScramble}
					wave={wave}
					panelLabel="Left"
					AutoScaleText={AutoScaleText}
				/>
				<div className="border-l shrink-0" />
				<ScramblePanelText
					panelState={rightPanel}
					selectedScramble={rightSelectedScramble}
					wave={wave}
					panelLabel="Right"
					AutoScaleText={AutoScaleText}
				/>
			</div>

			{}
			<div
				className="flex shrink-0 border-t"
				style={{ height: "325px", padding: "16px", marginBottom: "0px" }}
			>
				<ScramblePanelCube
					panelState={leftPanel}
					selectedScramble={leftSelectedScramble}
					panelLabel="Left"
				/>
				<div className="border-l shrink-0" />
				<ScramblePanelCube
					panelState={rightPanel}
					selectedScramble={rightSelectedScramble}
					panelLabel="Right"
				/>
			</div>
		</div>
	);
}
