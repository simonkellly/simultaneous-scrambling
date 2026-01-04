import { useState } from "react";
import { Encrypter } from "./components/Encrypter";
import { Viewer } from "./components/Viewer";
import "./index.css";

type Mode = "viewer" | "encrypter";

export function App() {
	const [mode, setMode] = useState<Mode>("viewer");

	return (
		<div className="h-screen flex flex-col">
			<div className="flex-1 overflow-hidden">
				{mode === "viewer" ? (
					<Viewer onSwitchToEncrypter={() => setMode("encrypter")} />
				) : (
					<Encrypter onSwitchToViewer={() => setMode("viewer")} />
				)}
			</div>
		</div>
	);
}

export default App;
