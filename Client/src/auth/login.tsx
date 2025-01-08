import React, { ReactElement, useActionState } from "react";
import { ServerApiConnection } from "../api/connection.js";
import { PrehashPassword, VaultCrypto } from "../crypto.js";
import { useSessionContext } from "../session/sessionManager.js";
import { useUserDataContext } from "../session/userDataManager.js";
import { CreateWrappingKeyFromPassword } from "../session/vaultManager.js";
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
					setMasterKey(await VaultCrypto.import(result.userData.dataPasswordKey, await CreateWrappingKeyFromPassword(password), false));
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
			<button onClick={ () => setPage("register") }>Do not have an account yet?</button>
		</>
	);
}
