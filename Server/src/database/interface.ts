import { AuthenticatorTransportFuture, CredentialDeviceType } from "@simplewebauthn/server";

/** User data */
export interface User {
	/** User's username */
	username: string;

	/**
	 * Hash of the user's password in the form `argon2(base64(SHA512("password:" + password)))`.
	 * Note, that the SHA512 hash is calculated on the client so server never knows the password, while the argon2 part is calculated on the server.
	 */
	passwordHash: string;

	/** User's stored data, encrypted on client, in the form `base64(iv):base64(AES-GCM(data key))` */
	encryptedData: string;
	/** Key to user's data, in the form `base64(iv):base64("raw" wrappedKey)`, protected by `AES-GCM(PBKDF2(password, "data-key"))` */
	dataPasswordKey: string;

	passkeys: Passkey[];
}

/** A session bound to a single client */
export interface Session {
	/** Id of the session */
	id: string;
	/** A secret value for the session, known to the client */
	secret: string;
	/** When did this session start (timestamp) */
	started: number;

	/** What user is currently bound to this session (if any; uses username) */
	currentUser: string | null;

	pendingChallenge: {
		challenge: string;
		rpID: string;
		/** userId for the credential. Only used when registering. */
		userId?: string;
	} | null;
}

/**
 * It is strongly advised that credentials get their own DB
 * table, ideally with a foreign key somewhere connecting it
 * to a specific UserModel.
 *
 * "SQL" tags below are suggestions for column data types and
 * how best to store data received during registration for use
 * in subsequent authentications.
 */
type Passkey = {
	id: string;
	rpID: string;
	publicKey: string;
	webAuthnUserID: string;
	counter: number;
	deviceType: CredentialDeviceType;
	backedUp: boolean;
	transports?: AuthenticatorTransportFuture[];

	/** Key to user's data, protected by a secret generated from the passkey. */
	dataKey: string;
};

export interface Datastore {
	//#region Session management
	sessionCreate(): Promise<Session>;
	sessionGet(id: string): Promise<Session | null>;
	sessionUpdate(id: string, data: Partial<Omit<Session, "id">>): Promise<boolean>;
	sessionDelete(id: string): Promise<void>;
	//#endregion

	//#region User management
	userRegister(data: User): Promise<boolean>;
	userGet(username: string): Promise<User | null>;
	userUpdate(username: string, data: Partial<Omit<User, "username">>): Promise<User | null>;
	userDelete(username: string): Promise<void>;

	userGetByPasskeyId(id: string, rpID: string): Promise<User | null>;
	//#endregion
}
