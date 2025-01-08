import React, { ReactElement } from "react";
import { SessionManager } from "./session/sessionManager.js";

export function Main(): ReactElement {
	return (
		<div className="main-content">
			<SessionManager />
		</div>
	);
}
