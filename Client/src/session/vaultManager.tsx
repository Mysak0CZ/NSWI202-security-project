import React, { createContext, ReactElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { CurrentUserData } from "../api/apiTypes.js";
import { ServerApiConnection } from "../api/connection.js";
import { ACCOUNT_MASTER_KEY_SALT, VaultCrypto } from "../crypto.js";
import { NotesList } from "../notes/notes.js";
import { Assert, AssertFail } from "../utilities.js";
import { useSessionContext } from "./sessionManager.js";
import { Settings } from "./settings.js";
import { useUserDataContext } from "./userDataManager.js";

const VaultNoteSechema = z.object({
	title: z.string(),
	content: z.string(),
});
export type VaultNote = z.infer<typeof VaultNoteSechema>;

const VaultDataSchema = z.object({
	notes: VaultNoteSechema.array().catch([]),
});
export type VaultData = z.infer<typeof VaultDataSchema>;

export async function CreateWrappingKeyFromPassword(password: string): Promise<VaultCrypto> {
	return await VaultCrypto.derive(password, ACCOUNT_MASTER_KEY_SALT);
}

export async function CreateInitialVaultData(password: string): Promise<{
	encryptedData: string;
	dataPasswordKey: string;
}> {
	const initialVault: VaultData = {
		notes: [],
	};

	const masterKey = await VaultCrypto.generate();
	const wrappingKey = await CreateWrappingKeyFromPassword(password);

	const encryptedData = await masterKey.encrypt(JSON.stringify(initialVault));
	const dataPasswordKey = await masterKey.export(wrappingKey);

	return { encryptedData, dataPasswordKey };
}

export interface VaultContext {
	vaultData: VaultData;
	setVaultData: (newData: VaultData) => Promise<void>;
}

const ReactVaultContext = createContext<VaultContext | null>(null);

export function VaultManager({ userData, masterKey }: {
	userData: CurrentUserData;
	masterKey: VaultCrypto;
}): ReactElement {
	const { sessionId, invalidateSession } = useSessionContext();
	const { updateUserData } = useUserDataContext();
	const [decodedData, setDecodedData] = useState<VaultData | undefined>(undefined);
	const [openSettings, setOpenSettings] = useState<boolean>(false);

	useEffect(() => {
		let pending = true;

		masterKey.decrypt(userData.encryptedData)
			.then((serializedVault) => {
				if (!pending)
					return;

				const parsedVaultData = VaultDataSchema.safeParse(JSON.parse(serializedVault));
				if (parsedVaultData.error) {
					console.error("Error parsing user's vault:", parsedVaultData.error.toString());
					setDecodedData(undefined);
				} else {
					setDecodedData(parsedVaultData.data);
				}
			})
			.catch((error) => {
				console.error("Error decrypting user's vault:", error);
				if (pending) {
					setDecodedData(undefined);
				}
			});

		return () => {
			pending = false;
		};
	}, [userData.encryptedData, masterKey]);

	const setVaultData = useCallback(async (newData: VaultData) => {
		const encryptedData = await masterKey.encrypt(JSON.stringify(newData));
		const result = await ServerApiConnection.userDataUpdate(sessionId, {
			encryptedData,
		});

		switch (result.result) {
			case "ok":
				updateUserData(result.userData);
				break;
			case "invalidSession":
				invalidateSession();
				break;
			case "notLoggedIn":
				updateUserData(null);
				break;
			case "failed":
				throw new Error("Server failed to update the data.");
			default:
				AssertFail(result);
		}
	}, [masterKey]);

	const logout = useCallback(() => {
		ServerApiConnection.sessionTerminate(sessionId)
			.then(() => {
				invalidateSession();
			})
			.catch((err) => {
				console.error("Error logging out:", err);
			});
	}, [sessionId, invalidateSession]);

	const context = useMemo((): VaultContext | null => (decodedData != null ? {
		vaultData: decodedData,
		setVaultData,
	} : null), [decodedData, setVaultData]);

	if (decodedData == null || context == null) {
		return (
			<>Decrypting vault...</>
		);
	}

	return (
		<ReactVaultContext.Provider value={ context }>
			<header>
				<span>Logged in as { userData.username }</span>
				<div>
					<button onClick={ () => {
						setOpenSettings(true);
					} }>
						Settings
					</button>
					<button onClick={ logout }>
						Logout
					</button>
				</div>
			</header>
			{
				openSettings ? (
					<Settings
						masterKey={ masterKey }
						userData={ userData }
						close={ () => {
							setOpenSettings(false);
						} }
					/>
				) : (
					<NotesList />
				)
			}
		</ReactVaultContext.Provider>
	);
}

export function useVaultContext(): VaultContext {
	const context = useContext(ReactVaultContext);
	Assert(context != null, "Attempt to use user data context outside of it.");
	return context;
}
