import React from "react";
import { createRoot } from "react-dom/client";
import "./index.scss";
import { Main } from "./main.js";

try {
	Run();
} catch (error) {
	console.error("Run failed:", error);
}

function Run(): void {
	createRoot(document.getElementById("body-root")!).render(
		<React.StrictMode>
			<Main />
		</React.StrictMode>,
	);
}
