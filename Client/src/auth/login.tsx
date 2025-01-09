import { AuthenticationResponseJSON, startAuthentication } from "@simplewebauthn/browser";
import React, { ReactElement, useActionState } from "react";
import { ServerApiConnection } from "../api/connection.js";
import { ACCOUNT_MASTER_KEY_PASSKEY_SALT, ACCOUNT_MASTER_KEY_SALT, PrehashPassword, VaultCrypto } from "../crypto.js";
import { useSessionContext } from "../session/sessionManager.js";
import { useUserDataContext } from "../session/userDataManager.js";
import { CreateWrappingKeyFromPassword } from "../session/vaultManager.js";
import { AssertFail } from "../utilities.js";
import { AuthPageProps } from "./authRouter.js";

export function LoginForm({ setPage }: AuthPageProps): ReactElement {
	const { sessionId, invalidateSession } = useSessionContext();
	const { updateUserData, setMasterKey } = useUserDataContext();

	const [error, submitAction, isPending] = useActionState<string, FormData>(
		async (_previousState, formData) => {
			const username = formData.get("username") as string | null;
			const password = formData.get("password") as string | null;
			if (!username || !password) {
				return "Username and password are required.";
			}

			const passwordHash = await PrehashPassword(password);
			const result = await ServerApiConnection.sessionLoginPassword(sessionId, {
				username,
				passwordHash,
			});

			switch (result.result) {
				case "ok":
					updateUserData(result.userData);
					setMasterKey(await VaultCrypto.import(result.userData.dataPasswordKey, await CreateWrappingKeyFromPassword(password), true));
					return "";
				case "invalidSession":
					invalidateSession();
					return "Please try again...";
				case "invalidCredentials":
					return "Invalid username or password.";
			}
		},
		"",
	);

	return (
		<>
			<form className="col" action={ submitAction }>
				<h1>Login</h1>
				<label>Username:</label>
				<input
					name="username"
					autoComplete="username"
					type="text"
					maxLength={ 64 }
					required
					disabled={ isPending }
				/>
				<label>Password:</label>
				<input
					name="password"
					type="password"
					autoComplete="current-password"
					maxLength={ 64 }
					required
					disabled={ isPending }
				/>
				{
					error ? (
						<span className="error">{ error }</span>
					) : null
				}
				<button type="submit" disabled={ isPending }>Login</button>
			</form>
			<hr className="fill-x" />
			<LoginPasskey />
			<hr className="fill-x" />
			<button onClick={ () => setPage("register") }>Do not have an account yet?</button>
		</>
	);
}

function LoginPasskey(): ReactElement {
	const { sessionId, invalidateSession } = useSessionContext();
	const { updateUserData, setMasterKey } = useUserDataContext();

	const [error, submitAction, isPending] = useActionState<string, FormData>(
		async () => {
			// Start authentication with server
			const startData = await ServerApiConnection.passkeyLoginInit(sessionId, {
				rpId: window.location.hostname,
			});

			switch (startData.result) {
				case "ok":
					break;
				case "invalidData":
				case "error":
					return "Login failed. Please try again later";
				case "invalidSession":
					invalidateSession();
					return "Session died.";
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

			let attResp: AuthenticationResponseJSON;
			try {
				// Pass the options to the authenticator and wait for a response
				attResp = await startAuthentication({ optionsJSON: startData.options });
			} catch (err) {
				console.log("Error authenticating passkey:", err);
				return "Error authenticating your passkey.";
			}

			// Get the response to the server

			// Extract PRF extension data (server shouldn't get those)
			// @ts-expect-error: Not yet supported by typings
			const prf: unknown = attResp.clientExtensionResults.prf;
			// @ts-expect-error: Not yet supported by typings
			delete attResp.clientExtensionResults.prf;

			console.log("Got authenticating response:", attResp, "with PRF data:", prf);

			// Check prf registration succeeded and got us some data
			if (
				prf == null ||
				typeof prf !== "object" ||
				!("results" in prf) ||
				prf.results == null ||
				typeof prf.results !== "object" ||
				!("first" in prf.results) ||
				!(prf.results.first instanceof ArrayBuffer)
			) {
				return "Your authenticator didn't return PRF key.";
			}

			// Make a protective key from the PRF data
			const wrappingKey = await VaultCrypto.derive(new Uint8Array(prf.results.first), ACCOUNT_MASTER_KEY_SALT);

			const result = await ServerApiConnection.passkeyLoginComplete(sessionId, {
				response: attResp,
			});

			switch (result.result) {
				case "invalidData":
					return "Login failed. Please try again later";
				case "ok":
					updateUserData(result.userData);
					setMasterKey(await VaultCrypto.import(result.dataKey, wrappingKey, true));
					return "";
				case "invalidSession":
					invalidateSession();
					return "Please try again...";
				case "invalidCredentials":
					return "Invalid username or password.";
			}
		},
		"",
	);

	return (
		<form className="col" action={ submitAction }>
			<button type="submit" disabled={ isPending }>Login using passkey</button>
			{
				error ? (
					<span className="error">{ error }</span>
				) : null
			}
		</form>
	);
}
