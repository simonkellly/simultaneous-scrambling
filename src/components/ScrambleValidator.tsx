import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { validateScramble } from "@/lib/validation";
import type { Wave } from "@/lib/wave-grouping";

interface ScrambleValidatorProps {
	scramble: string;
	eventId: string;
	groupNumber: number;
	scrambleIndex: number | "E1" | "E2";
	wave: Wave;
}

export function ScrambleValidator({
	scramble,
	eventId,
	scrambleIndex,
	wave,
}: ScrambleValidatorProps) {
	const [isValid, setIsValid] = useState<boolean | null>(null);
	const [isValidating, setIsValidating] = useState(true);

	useEffect(() => {
		let cancelled = false;

		setIsValidating(true);
		setIsValid(null);

		const validate = async () => {
			await new Promise((resolve) => setTimeout(resolve, 1000));

			if (cancelled) return;

			const scrambleTextElements = document.querySelectorAll(".font-mono");
			let foundMatchingText = false;

			const normalizedScramble = scramble.replace(/\s+/g, " ").trim();

			for (const element of Array.from(scrambleTextElements)) {
				const text = element.textContent?.trim();

				const normalizedText = text?.replace(/\s+/g, " ").trim();

				if (normalizedText === normalizedScramble) {
					foundMatchingText = true;
					break;
				}
			}

			if (cancelled) return;

			if (!foundMatchingText) {
				if (!cancelled) {
					setIsValidating(false);
					setIsValid(null);
				}
				return;
			}

			if (!wave.scrambleHashes) {
				if (!cancelled) {
					setIsValidating(false);
					setIsValid(null);
				}
				return;
			}

			const group = wave.groups.find((g) => g.eventId === eventId);
			if (!group) {
				if (!cancelled) {
					setIsValidating(false);
					setIsValid(null);
				}
				return;
			}

			const hashKey =
				scrambleIndex === "E1" || scrambleIndex === "E2"
					? `${eventId}-${group.groupNumber}-${scrambleIndex}`
					: `${eventId}-${group.groupNumber}-${scrambleIndex}`;
			const expectedHash = wave.scrambleHashes[hashKey];

			if (!expectedHash) {
				if (!cancelled) {
					setIsValidating(false);
					setIsValid(null);
				}
				return;
			}

			try {
				const valid = await validateScramble(scramble, expectedHash);
				if (!cancelled) {
					setIsValid(valid);
					setIsValidating(false);
				}
			} catch {
				if (!cancelled) {
					setIsValid(false);
					setIsValidating(false);
				}
			}
		};

		if (scramble) {
			validate();
		} else {
			setIsValidating(false);
			setIsValid(null);
		}

		return () => {
			cancelled = true;
		};
	}, [scramble, eventId, scrambleIndex, wave.scrambleHashes, wave.groups]);

	const displayGroup = wave.groups.find((g) => g.eventId === eventId);
	const roundId = displayGroup?.roundId || "";
	const displayGroupNumber = displayGroup?.groupNumber || 0;

	const formatRoundId = (id: string): string => {
		const match = id.match(/-r(\d+)$/);
		return match ? `R${match[1]}` : id;
	};

	const validationInfo = displayGroup
		? `${eventId} ${formatRoundId(roundId)} G${displayGroupNumber} A${
				typeof scrambleIndex === "number" ? scrambleIndex + 1 : scrambleIndex
			}`
		: "";

	if (isValidating) {
		return (
			<div className="flex items-center gap-1.5 text-xs font-medium mb-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400">
				<Loader2 className="h-3 w-3 animate-spin" />
				<span>Validating {validationInfo}...</span>
			</div>
		);
	}

	if (isValid === null) {
		return (
			<div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
				<span>
					Validation unavailable {validationInfo && `(${validationInfo})`}
				</span>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex items-center gap-1.5 text-xs font-medium mb-1 px-2 py-1 rounded-md",
				isValid
					? "bg-green-500/10 text-green-700 dark:text-green-400"
					: "bg-red-500/10 text-red-700 dark:text-red-400",
			)}
		>
			{isValid ? (
				<>
					<CheckCircle2 className="h-3 w-3" />
					<span>Verified {validationInfo}</span>
				</>
			) : (
				<>
					<XCircle className="h-3 w-3" />
					<span>
						Validation failed {validationInfo && `(${validationInfo})`}
					</span>
				</>
			)}
		</div>
	);
}
