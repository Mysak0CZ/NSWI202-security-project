import React, { ReactElement, useActionState } from "react";
import { ServerApiConnection } from "../api/connection.js";
import { PrehashPassword, VaultCrypto } from "../crypto.js";
import { useSessionContext } from "../session/sessionManager.js";
import { AssertFail } from "../utilities.js";
import { AuthPageProps } from "./authRouter.js";
import { useUserDataContext } from "../session/userDataManager.js";
import { CreateInitialVaultData, CreateWrappingKeyFromPassword } from "../session/vaultManager.js";

export function RegisterForm({ setPage }: AuthPageProps): ReactElement {
	const { sessionId, invalidateSession } = useSessionContext();
	const { updateUserData, setMasterKey } = useUserDataContext();

	const [error, submitAction, isPending] = useActionState<string, FormData>(
		async (_previousState, formData) => {
			const username = formData.get("username") as string | null;
			const password = formData.get("password") as string | null;
			const password2 = formData.get("password2") as string | null;
			if (!username || !password) {
				return "Username and password are required.";
			}

			if (password !== password2) {
				return "Passwords do not match.";
			}

			const passwordHash = await PrehashPassword(password);
			const { dataPasswordKey, encryptedData } = await CreateInitialVaultData(password);

			const result = await ServerApiConnection.sessionRegister(sessionId, {
				username,
				passwordHash,
				dataPasswordKey,
				encryptedData,
			});

			switch (result.result) {
				case "ok":
					updateUserData(result.userData);
					setMasterKey(await VaultCrypto.import(dataPasswordKey, await CreateWrappingKeyFromPassword(password), true));
					return "";
				case "invalidSession":
					invalidateSession();
					return "Please try again...";
				case "userExists":
					return "User with this name already exists.";
				case "invalidData":
					return "Invalid username format.";
			}

			AssertFail(result);
		},
		"",
	);

	return (
		<>
			<form className="col" action={ submitAction }>
				<h1>Registration</h1>
				<label>Username:</label>
				<input
					name="username"
					autoComplete="username"
					type="text"
					defaultValue=""
					maxLength={ 64 }
					required
					disabled={ isPending }
				/>
				<label>Password:</label>
				<input
					name="password"
					type="password"
					autoComplete="new-password"
					defaultValue=""
					maxLength={ 64 }
					required
					disabled={ isPending }
				/>
				<label>Repeat password:</label>
				<input
					name="password2"
					type="password"
					autoComplete="new-password"
					defaultValue=""
					maxLength={ 64 }
					required
					disabled={ isPending }
				/>
				{
					error ? (
						<span className="error">{ error }</span>
					) : null
				}
				<button type="submit" disabled={ isPending }>Register</button>
			</form>
			<hr className="fill-x" />
			<button onClick={ () => setPage("login") }>Already have an account?</button>
		</>
	);
}
