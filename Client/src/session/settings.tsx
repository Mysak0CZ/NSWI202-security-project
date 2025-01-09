import { RegistrationResponseJSON, startRegistration } from "@simplewebauthn/browser";
import React, { MouseEvent, ReactElement, useActionState, useState } from "react";
import { CurrentUserData } from "../api/apiTypes.js";
import { ServerApiConnection } from "../api/connection.js";
import { ACCOUNT_MASTER_KEY_PASSKEY_SALT, ACCOUNT_MASTER_KEY_SALT, VaultCrypto } from "../crypto.js";
import { AssertFail } from "../utilities.js";
import { useSessionContext } from "./sessionManager.js";
import { useUserDataContext } from "./userDataManager.js";

export function Settings({ userData, masterKey, close }: {
	userData: CurrentUserData;
	masterKey: VaultCrypto;
	close: () => void;
}): ReactElement {
	const [registerPasskey, setRegisterPasskey] = useState(false);

	if (registerPasskey) {
		return <RegisterPasskey masterKey={ masterKey } close={ () => setRegisterPasskey(false) } />;
	}

	return (
		<div className="settings">
			<h1>Settings</h1>
			<button onClick={ close }>
				Back
			</button>
			<h2>Passkeys</h2>
			<span>The following passkeys are registered for this account:</span>
			<ul>
				{
					userData.passkeys.map((passkey, index) => (
						<li key={ index }>
							{ passkey.id } ({ passkey.transports })
						</li>
					))
				}
			</ul>
			<button onClick={ () => {
				setRegisterPasskey(true);
			} }>
				Register a new passkey
			</button>
		</div>
	);
}

export function RegisterPasskey({ masterKey, close }: {
	masterKey: VaultCrypto;
	close: () => void;
}): ReactElement {
	const { sessionId, invalidateSession } = useSessionContext();
	const { updateUserData } = useUserDataContext();

	const [error, submitAction, isPending] = useActionState<string, MouseEvent>(
		async () => {
			// Start registration with server
			const startData = await ServerApiConnection.passkeyRegisterInit(sessionId, {
				rpId: window.location.hostname,
			});

			switch (startData.result) {
				case "ok":
					break;
				case "invalidData":
				case "error":
					return "Registration failed. Please try again later";
				case "invalidSession":
					invalidateSession();
					return "Session died.";
				case "notLoggedIn":
					updateUserData(null);
					return "Not logged in.";
				default:
					AssertFail(startData);
			}

			// Inject PRF extension data
			startData.options.extensions ??= {};
			// @ts-expect-error: Not yet supported by typings
			startData.options.extensions.prf = {
				eval: {
					first: ACCOUNT_MASTER_KEY_PASSKEY_SALT,
				},
			};

			let attResp: RegistrationResponseJSON;
			try {
				// Pass the options to the authenticator and wait for a response
				attResp = await startRegistration({ optionsJSON: startData.options });
			} catch (err) {
				console.log("Error registering passkey:", err);
				if (err instanceof Error) {
					if (err.name === "InvalidStateError") {
						return "Error: Authenticator was probably already registered by user";
					}
				}

				return "Error registering passkey on your computer.";
			}

			// Get the response to the server

			// Extract PRF extension data (server shouldn't get those)
			// @ts-expect-error: Not yet supported by typings
			const prf: unknown = attResp.clientExtensionResults.prf;
			// @ts-expect-error: Not yet supported by typings
			delete attResp.clientExtensionResults.prf;

			console.log("Got registration response:", attResp, "with PRF data:", prf);

			// Check prf registration succeeded and got us some data
			if (
				prf == null ||
				typeof prf !== "object" ||
				!("enabled" in prf) ||
				prf.enabled !== true ||
				!("results" in prf) ||
				prf.results == null ||
				typeof prf.results !== "object" ||
				!("first" in prf.results) ||
				!(prf.results.first instanceof ArrayBuffer)
			) {
				return "Your authenticator doesn't seem to support PRF.";
			}

			// Make a protective key from the PRF data
			const wrappingKey = await VaultCrypto.derive(new Uint8Array(prf.results.first), ACCOUNT_MASTER_KEY_SALT);
			const dataKey = await masterKey.export(wrappingKey);

			const finishResult = await ServerApiConnection.passkeyRegisterComplete(sessionId, {
				dataKey,
				response: attResp,
			});

			switch (finishResult.result) {
				case "ok":
					break;
				case "invalidData":
				case "error":
					return "Registration failed. Please try again later";
				case "invalidSession":
					invalidateSession();
					return "Session died.";
				case "notLoggedIn":
					updateUserData(null);
					return "Not logged in.";
				default:
					AssertFail(finishResult);
			}

			// We are done!
			updateUserData(finishResult.userData);
			close();
			return "Success!";
		},
		"",
	);

	return (
		<div className="centerbox flex-1">
			<div className="authForm col">
				<h1>Passkey registration</h1>
				<span>Note: The passkey must support the PRF extension.</span>
				<button onClick={ submitAction } disabled={ isPending }>Register</button>
				{
					error ? (
						<span className="error">{ error }</span>
					) : null
				}
			</div>
		</div>
	);
}
