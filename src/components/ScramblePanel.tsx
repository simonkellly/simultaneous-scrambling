import { Button } from "@/components/ui/button";
import { formatEventName, shouldUseSingleLineMode } from "@/lib/event-config";
import type { Wave } from "@/lib/wave-grouping";
import { ScrambleDisplay } from "./ScrambleDisplay";
import { ScrambleValidator } from "./ScrambleValidator";

interface PanelState {
	eventId: string | null;
	scrambleIndex: number | "E1" | "E2" | null;
}

interface ScramblePanelControlsProps {
	panelState: PanelState;
	events: string[];
	scrambles: string[];
	extraScrambles: string[];
	panelLabel: string;
	onEventChange: (eventId: string) => void;
	onScrambleClick: (index: number | "E1" | "E2") => void;
}

export function ScramblePanelControls({
	panelState,
	events,
	scrambles,
	extraScrambles,
	panelLabel,
	onEventChange,
	onScrambleClick,
}: ScramblePanelControlsProps) {
	return (
		<div
			className="w-1/2 flex flex-col gap-1"
			style={{
				paddingRight: panelLabel === "Left" ? "8px" : "0",
				paddingLeft: panelLabel === "Right" ? "8px" : "0",
			}}
		>
			<div
				className="flex flex-wrap gap-1"
				id={`${panelLabel.toLowerCase()}-event-select`}
			>
				{events.map((eventId) => (
					<Button
						key={eventId}
						variant={panelState.eventId === eventId ? "default" : "outline"}
						size="sm"
						onClick={() => onEventChange(eventId)}
					>
						{eventId}
					</Button>
				))}
			</div>
			{panelState.eventId &&
				(scrambles.length > 0 || extraScrambles.length > 0) && (
					<>
						<label
							htmlFor={`${panelLabel.toLowerCase()}-scramble-select`}
							className="text-sm font-medium mt-1"
						>
							{panelLabel} - Scramble
						</label>
						<div
							className="flex flex-wrap gap-1"
							id={`${panelLabel.toLowerCase()}-scramble-select`}
						>
							{scrambles.map((_, index) => (
								<Button
									key={scrambles[index] + index.toString()}
									variant={
										panelState.scrambleIndex === index ? "default" : "outline"
									}
									size="sm"
									onClick={() => onScrambleClick(index)}
								>
									{index + 1}
								</Button>
							))}
							{extraScrambles.length > 0 && (
								<div className="flex gap-1 ml-4">
									{extraScrambles.length >= 1 && (
										<Button
											variant={
												panelState.scrambleIndex === "E1"
													? "default"
													: "outline"
											}
											size="sm"
											onClick={() => onScrambleClick("E1")}
										>
											E1
										</Button>
									)}
									{extraScrambles.length >= 2 && (
										<Button
											variant={
												panelState.scrambleIndex === "E2"
													? "default"
													: "outline"
											}
											size="sm"
											onClick={() => onScrambleClick("E2")}
										>
											E2
										</Button>
									)}
								</div>
							)}
						</div>
					</>
				)}
		</div>
	);
}

interface ScramblePanelTextProps {
	panelState: PanelState;
	selectedScramble: string | null;
	wave: Wave;
	panelLabel: string;
	AutoScaleText: React.ComponentType<{
		scramble: string;
		eventId: string;
		className?: string;
		minFontSize?: number;
		maxFontSize?: number;
		singleLineMode?: boolean;
	}>;
}

export function ScramblePanelText({
	panelState,
	selectedScramble,
	wave,
	panelLabel,
	AutoScaleText,
}: ScramblePanelTextProps) {
	return (
		<div
			className="w-1/2 flex flex-col h-full"
			style={{
				paddingRight: panelLabel === "Left" ? "16px" : "0",
				paddingLeft: panelLabel === "Right" ? "16px" : "0",
			}}
		>
			{selectedScramble && (
				<>
					<div className="text-center pt-2 pb-1 shrink-0 relative">
						{panelState.scrambleIndex !== null && (
							<div className="absolute top-2 right-0">
								<ScrambleValidator
									scramble={selectedScramble}
									eventId={panelState.eventId ?? ""}
									groupNumber={wave.waveNumber}
									scrambleIndex={panelState.scrambleIndex}
									wave={wave}
								/>
							</div>
						)}
						<div className="text-4xl font-bold mb-1">
							{panelState.scrambleIndex === "E1"
								? "Extra 1"
								: panelState.scrambleIndex === "E2"
									? "Extra 2"
									: `Attempt ${(panelState.scrambleIndex as number) + 1}`}
						</div>
						<div className="text-xl font-semibold text-muted-foreground">
							{formatEventName(panelState.eventId ?? "")}
						</div>
					</div>
					<div className="flex-1 flex flex-col items-center justify-center min-h-0">
						<div className="flex-1 w-full" style={{ padding: "0 16px" }}>
							<AutoScaleText
								scramble={selectedScramble}
								eventId={panelState.eventId ?? ""}
								className="font-mono text-left font-bold"
								minFontSize={12}
								maxFontSize={64}
								singleLineMode={shouldUseSingleLineMode(
									panelState.eventId ?? "",
								)}
							/>
						</div>
					</div>
				</>
			)}
		</div>
	);
}

interface ScramblePanelCubeProps {
	panelState: PanelState;
	selectedScramble: string | null;
	panelLabel: string;
}

export function ScramblePanelCube({
	panelState,
	selectedScramble,
	panelLabel,
}: ScramblePanelCubeProps) {
	return (
		<div
			className="w-1/2"
			style={{
				paddingRight: panelLabel === "Left" ? "16px" : "0",
				paddingLeft: panelLabel === "Right" ? "16px" : "0",
			}}
		>
			{selectedScramble && (
				<ScrambleDisplay
					key={`${panelLabel.toLowerCase()}-${panelState.eventId}-${panelState.scrambleIndex}`}
					scramble={selectedScramble}
					eventId={panelState.eventId ?? ""}
					className="h-full w-full"
				/>
			)}
		</div>
	);
}
