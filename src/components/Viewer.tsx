import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { decryptWave, generateHash } from "@/lib/encryption";
import type { Wave } from "@/lib/wave-grouping";
import { PasswordModal } from "./PasswordModal";
import { SplitScreenView } from "./SplitScreenView";
import { WaveButtons } from "./WaveButtons";

interface ViewerProps {
	onSwitchToEncrypter?: () => void;
}

interface EncryptedWave {
	waveNumber: number;
	encryptedData: string;
	iv: string;
	salt: string;
}

interface ScrambleData {
	waves: EncryptedWave[];
	metadata: {
		title: string;
		totalWaves: number;
		events: string[];
	};
}

export function Viewer({ onSwitchToEncrypter }: ViewerProps = {}) {
	const [scrambleData, setScrambleData] = useState<ScrambleData | null>(null);
	const [fileHash, setFileHash] = useState<string>("");
	const [unlockedWaves, setUnlockedWaves] = useState<Map<number, Wave>>(
		new Map(),
	);
	const [selectedWave, setSelectedWave] = useState<number | null>(null);
	const [passwordModalOpen, setPasswordModalOpen] = useState(false);
	const [passwordModalWave, setPasswordModalWave] = useState<number | null>(
		null,
	);
	const [error, setError] = useState("");

	const STORAGE_KEY = "scramble-data";

	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				const data = JSON.parse(stored) as ScrambleData;
				setScrambleData(data);
				generateHash(stored).then(setFileHash);
				setError("");
			} catch {
				setError("Failed to parse stored scramble data");
				localStorage.removeItem(STORAGE_KEY);
			}
		}
	}, []);

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const data = JSON.parse(text) as ScrambleData;

			if (!data.waves || !data.metadata || !data.metadata.title) {
				throw new Error("Invalid scramble data file format");
			}

			const hash = await generateHash(text);
			setFileHash(hash);

			localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
			setScrambleData(data);
			setError("");
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to load scramble data file",
			);
		}
	};

	const handleLogout = () => {
		localStorage.removeItem(STORAGE_KEY);
		setScrambleData(null);
		setFileHash("");
		setUnlockedWaves(new Map());
		setSelectedWave(null);
		setPasswordModalOpen(false);
		setPasswordModalWave(null);
		setError("");
	};

	const handleWaveClick = (waveNumber: number) => {
		if (selectedWave === waveNumber) {
			handleBackToHome();
			return;
		}

		if (selectedWave !== null && selectedWave !== waveNumber) {
			const newUnlocked = new Map(unlockedWaves);
			newUnlocked.delete(selectedWave);
			setUnlockedWaves(newUnlocked);
		}

		if (unlockedWaves.has(waveNumber)) {
			setSelectedWave(waveNumber);
			return;
		}

		setPasswordModalWave(waveNumber);
		setPasswordModalOpen(true);
	};

	const handleUnlock = async (password: string) => {
		if (!scrambleData || passwordModalWave === null) {
			throw new Error("Invalid state");
		}

		const wave = scrambleData.waves.find(
			(w) => w.waveNumber === passwordModalWave,
		);
		if (!wave) {
			throw new Error("Wave not found");
		}

		try {
			const decrypted = (await decryptWave(
				wave.encryptedData,
				wave.iv,
				wave.salt,
				password,
			)) as Wave;

			const newUnlocked = new Map(unlockedWaves);
			newUnlocked.set(passwordModalWave, decrypted);
			setUnlockedWaves(newUnlocked);
			setSelectedWave(passwordModalWave);
		} catch (err) {
			throw new Error(err instanceof Error ? err.message : "Decryption failed");
		}
	};

	const handleBackToHome = () => {
		if (selectedWave !== null) {
			const newUnlocked = new Map(unlockedWaves);
			newUnlocked.delete(selectedWave);
			setUnlockedWaves(newUnlocked);
		}
		setSelectedWave(null);
	};

	if (!scrambleData) {
		return (
			<div className="flex flex-col h-full w-full">
				{error && (
					<div className="border-b py-2 px-4 flex items-center shrink-0 bg-background z-10">
						<p className="text-destructive text-sm">{error}</p>
					</div>
				)}
				<div className="flex-1 flex items-center justify-center p-8 overflow-auto">
					<Card className="w-full max-w-md">
						<CardContent className="pt-6 space-y-4">
							<div className="text-center space-y-2">
								<h1 className="text-2xl font-bold">Upload Scramble Data</h1>
								<p className="text-muted-foreground">
									Upload your encrypted scramble data file to get started
								</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="scramble-file">Scramble Data File</Label>
								<Input
									id="scramble-file"
									type="file"
									accept=".json"
									onChange={handleFileUpload}
								/>
							</div>
							{error && <p className="text-destructive text-sm">{error}</p>}
							{onSwitchToEncrypter && (
								<div className="pt-2">
									<Button
										variant="outline"
										onClick={onSwitchToEncrypter}
										className="w-full"
									>
										Go to Encrypter
									</Button>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	if (selectedWave !== null && unlockedWaves.has(selectedWave)) {
		return (
			<div className="flex flex-col h-full fixed inset-0">
				<div className="border-b py-2 px-4 flex items-center justify-center shrink-0 bg-background z-10 relative">
					<div className="absolute left-4">
						<p className="text-xl font-extrabold text-foreground">
							{scrambleData.metadata.title}
						</p>
					</div>
					<WaveButtons
						totalWaves={scrambleData.metadata.totalWaves}
						selectedWave={selectedWave}
						unlockedWaves={unlockedWaves}
						onWaveClick={handleWaveClick}
					/>
					<div className="absolute right-4 flex gap-2">
						<Button variant="outline" size="sm" onClick={handleBackToHome}>
							Back to Home
						</Button>
						<Button variant="outline" size="sm" onClick={handleLogout}>
							<LogOut className="h-4 w-4 mr-2" />
							Logout
						</Button>
					</div>
				</div>
				<div className="flex-1 overflow-hidden min-h-0">
					<SplitScreenView
						wave={
							unlockedWaves.get(selectedWave) ?? { waveNumber: 0, groups: [] }
						}
						title={scrambleData.metadata.title}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full w-full">
			<div className="border-b py-2 px-4 flex items-center justify-center shrink-0 bg-background z-10 relative">
				<WaveButtons
					totalWaves={scrambleData.metadata.totalWaves}
					selectedWave={null}
					unlockedWaves={unlockedWaves}
					onWaveClick={handleWaveClick}
					showCheckmark={true}
				/>
				<Button
					variant="outline"
					size="sm"
					onClick={handleLogout}
					className="absolute right-4"
				>
					<LogOut className="h-4 w-4 mr-2" />
					Logout
				</Button>
			</div>
			<div className="flex-1 flex flex-col pt-4 overflow-auto">
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center space-y-2">
						<h1 className="text-4xl font-bold">
							{scrambleData.metadata.title}
						</h1>
						<p className="text-muted-foreground">
							Select a wave to unlock and view scrambles
						</p>
					</div>
				</div>
				{fileHash && (
					<div className="text-center mt-auto pt-4 pb-4">
						<p className="text-xs text-muted-foreground font-mono">
							{fileHash}
						</p>
					</div>
				)}
			</div>
			{onSwitchToEncrypter && (
				<div className="border-t py-2 px-4 flex justify-center shrink-0 bg-background">
					<Button variant="outline" size="sm" onClick={onSwitchToEncrypter}>
						Go to Encrypter
					</Button>
				</div>
			)}

			<PasswordModal
				open={passwordModalOpen}
				onOpenChange={(open) => {
					setPasswordModalOpen(open);
					if (!open) {
						setPasswordModalWave(null);
					}
				}}
				waveNumber={passwordModalWave || 0}
				onUnlock={handleUnlock}
			/>
		</div>
	);
}
