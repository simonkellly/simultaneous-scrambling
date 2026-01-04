import { TwistyPlayer } from "cubing/twisty";
import { memo, useEffect, useRef } from "react";
import { getPuzzleType } from "@/lib/event-config";
import { cn } from "@/lib/utils";

interface ScrambleDisplayProps {
	scramble: string;
	eventId: string;
	className?: string;
}

export const ScrambleDisplay = memo(function ScrambleDisplay({
	scramble,
	eventId,
	className,
}: ScrambleDisplayProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const playerRef = useRef<TwistyPlayer | null>(null);
	const currentEventIdRef = useRef<string | null>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		const puzzleType = getPuzzleType(eventId);
		const eventIdChanged = currentEventIdRef.current !== eventId;

		if (!playerRef.current || eventIdChanged) {
			if (containerRef.current) {
				containerRef.current.innerHTML = "";
			}

			const newPlayer = new TwistyPlayer({
				puzzle: puzzleType,
				visualization: "2D",
				background: "none",
				hintFacelets: "none",
				controlPanel: "none",
				experimentalDragInput: "none",
			});

			newPlayer.style.width = "100%";
			newPlayer.style.height = "100%";

			if (containerRef.current) {
				containerRef.current.innerHTML = "";
				containerRef.current.appendChild(newPlayer);
			}
			playerRef.current = newPlayer;
			currentEventIdRef.current = eventId;
		}

		return () => {
			if (containerRef.current && playerRef.current) {
				containerRef.current.innerHTML = "";
				playerRef.current = null;
			}
		};
	}, [eventId]);

	useEffect(() => {
		if (!playerRef.current || !scramble) return;

		playerRef.current.alg = scramble;
	}, [scramble]);

	return (
		<div className={cn("w-full h-full", className)}>
			<div
				ref={containerRef}
				className="w-full h-full"
				style={{ height: "100%" }}
			/>
		</div>
	);
});
