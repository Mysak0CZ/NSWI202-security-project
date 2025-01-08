import React, { createContext, ReactElement, useContext, useEffect, useMemo, useState } from "react";
import { CurrentUserData } from "../api/apiTypes.js";
import { ServerApiConnection } from "../api/connection.js";
import { AuthRouter } from "../auth/authRouter.js";
import { VaultCrypto } from "../crypto.js";
import { Assert, AssertFail } from "../utilities.js";
import { useSessionContext } from "./sessionManager.js";
import { VaultManager } from "./vaultManager.js";

export interface UserDataContext {
	userData: CurrentUserData | null;
	updateUserData: (newUserData: CurrentUserData | null) => void;
	setMasterKey: (crypto: VaultCrypto) => void;
}

const ReactUserDataContext = createContext<UserDataContext | null>(null);

export function UserDataManager(): ReactElement {
	const { sessionId, invalidateSession } = useSessionContext();

	const [userData, setUserData] = useState<CurrentUserData | null | undefined>(undefined);
	const [masterKey, setMasterKey] = useState<VaultCrypto | undefined>(undefined);

	useEffect(() => {
		if (userData !== undefined)
			return;

		// Request new session from the server
		let pending = true;
		function tryGetData() {
			if (!pending)
				return;

			ServerApiConnection.userDataGet(sessionId)
				.then((result) => {
					if (!pending)
						return;

					switch (result.result) {
						case "ok":
							setUserData(result.userData);
							break;
						case "invalidSession":
							invalidateSession();
							break;
						case "notLoggedIn":
							setUserData(null);
							break;
						default:
							AssertFail(result);
					}
				})
				.catch((error) => {
					console.error("Failed to get a session:", error);
					setTimeout(tryGetData, 1_000);
				});
		}

		tryGetData();

		return () => {
			pending = false;
		};
	}, [sessionId]);

	const context = useMemo((): UserDataContext => ({
		userData: userData ?? null,
		updateUserData: setUserData,
		setMasterKey,
	}), [userData]);

	// No data yet (neither that we are logged in, nor that we aren't)
	if (userData === undefined) {
		return (
			<>Loading data...</>
		);
	}

	if (userData === null) {
		return (
			<ReactUserDataContext.Provider value={ context }>
				<AuthRouter />
			</ReactUserDataContext.Provider>
		);
	}

	if (masterKey == null) {
		return (
			<>Decrypting master key...</>
		);
	}

	return (
		<ReactUserDataContext.Provider value={ context }>
			<VaultManager userData={ userData } masterKey={ masterKey } />
		</ReactUserDataContext.Provider>
	);
}

export function useUserDataContext(): UserDataContext {
	const context = useContext(ReactUserDataContext);
	Assert(context != null, "Attempt to use user data context outside of it.");
	return context;
}
