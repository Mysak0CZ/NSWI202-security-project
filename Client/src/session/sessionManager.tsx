import React, { createContext, ReactElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ServerApiConnection } from "../api/connection.js";
import { Assert } from "../utilities.js";
import { UserDataManager } from "./userDataManager.js";

export interface SessionContext {
	sessionId: string;
	invalidateSession: () => void;
}

const ReactSessionContext = createContext<SessionContext | null>(null);

export function SessionManager(): ReactElement {
	const [sessionId, setSessionId] = useState<string>("");

	const updateSessionId = useCallback((id: string | null) => {
		if (id) {
			setSessionId(id);
		} else {
			setSessionId("");
		}
	}, []);

	useEffect(() => {
		if (sessionId)
			return;

		// Request new session from the server
		let pending = true;
		function tryConnect() {
			if (!pending)
				return;

			ServerApiConnection.sessionInit()
				.then((result) => {
					if (!pending)
						return;

					updateSessionId(result.session);
				})
				.catch((error) => {
					console.error("Failed to get a session:", error);
					setTimeout(tryConnect, 1_000);
				});
		}

		tryConnect();

		return () => {
			pending = false;
		};
	}, [sessionId]);

	const sessionContext = useMemo(
		(): SessionContext | null => (sessionId ? ({
			sessionId,
			invalidateSession: () => updateSessionId(null),
		}) : null),
		[sessionId],
	);

	if (!sessionContext) {
		return (
			<>Connecting to the server...</>
		);
	}

	return (
		<ReactSessionContext.Provider value={ sessionContext }>
			<UserDataManager key={ sessionId } />
		</ReactSessionContext.Provider>
	);
}

export function useSessionContext(): SessionContext {
	const context = useContext(ReactSessionContext);
	Assert(context != null, "Attempt to use session context outside of it.");
	return context;
}
