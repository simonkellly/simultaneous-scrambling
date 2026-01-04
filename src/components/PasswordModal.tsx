import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasswordModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	waveNumber: number;
	onUnlock: (password: string) => Promise<void>;
}

export function PasswordModal({
	open,
	onOpenChange,
	waveNumber,
	onUnlock,
}: PasswordModalProps) {
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			await onUnlock(password);
			setPassword("");
			onOpenChange(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Incorrect password");
		} finally {
			setLoading(false);
		}
	};

	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			setPassword("");
			setError("");
		}
		onOpenChange(newOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Unlock Wave {waveNumber}</DialogTitle>
					<DialogDescription>
						Enter the password to unlock this wave and view its scrambles.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="text"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Enter wave password"
								maxLength={12}
								autoFocus
								disabled={loading}
							/>
							{error && <p className="text-sm text-destructive">{error}</p>}
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
							disabled={loading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={loading || password.length === 0}>
							{loading ? "Unlocking..." : "Unlock"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
