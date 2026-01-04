import { Button } from "@/components/ui/button";

interface WaveButtonsProps {
	totalWaves: number;
	selectedWave: number | null;
	unlockedWaves: Map<number, unknown>;
	onWaveClick: (waveNum: number) => void;
	showCheckmark?: boolean;
}

export function WaveButtons({
	totalWaves,
	selectedWave,
	unlockedWaves,
	onWaveClick,
	showCheckmark = false,
}: WaveButtonsProps) {
	return (
		<div className="flex gap-2">
			{Array.from({ length: totalWaves }, (_, i) => i + 1).map((waveNum) => {
				const isSelected = selectedWave === waveNum;
				const isUnlocked = unlockedWaves.has(waveNum);

				return (
					<Button
						key={waveNum}
						variant={
							isSelected || (showCheckmark && isUnlocked)
								? "default"
								: "outline"
						}
						onClick={() => onWaveClick(waveNum)}
					>
						Wave {waveNum}
						{showCheckmark && isUnlocked && " ✓"}
					</Button>
				);
			})}
		</div>
	);
}
