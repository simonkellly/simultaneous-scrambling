import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	worker: {
		format: "es",
	},
	optimizeDeps: {
		exclude: ["cubing"],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	base: "/simultaneous-scrambling/",
	server: {
		port: 5173,
	},
});
