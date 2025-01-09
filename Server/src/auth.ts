import { AuthenticationResponseJSON, generateAuthenticationOptions, generateRegistrationOptions, PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON, RegistrationResponseJSON, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import * as argon2 from "argon2";
import { WEBAUTH_RP_NAME } from "./config.ts";
import { Base64ToBytes, BytesToBase64 } from "./crypto.ts";
import { Datastore, Session, User } from "./database/interface.ts";
import { SessionRegisterRequest } from "./routes/apiTypes.ts";

export async function AuthRegister(db: Datastore, session: Session, register: SessionRegisterRequest): Promise<User | null> {
	const passwordHash = await argon2.hash(register.passwordHash, {
		type: argon2.argon2id,
	});

	const user: User = {
		username: register.username,
		passwordHash,
		encryptedData: register.encryptedData,
		dataPasswordKey: register.dataPasswordKey,
		passkeys: [],
	};

	const result = await db.userRegister(user);

	if (result) {
		session.currentUser = user.username;
		await db.sessionUpdate(session.id, {
			currentUser: user.username,
		});
		return user;
	}

	return null;
}

export async function AuthPassword(db: Datastore, session: Session, username: string, passwordPreHash: string): Promise<User | null> {
	const user = await db.userGet(username);

	if (user == null)
		return null;

	const result = await argon2.verify(user.passwordHash, passwordPreHash);

	if (!result)
		return null;

	session.currentUser = user.username;
	await db.sessionUpdate(session.id, {
		currentUser: user.username,
	});

	return user;
}

export async function WebauthRegisterInit(db: Datastore, session: Session, user: User, rpID: string): Promise<PublicKeyCredentialCreationOptionsJSON> {
	const options = await generateRegistrationOptions({
		rpName: WEBAUTH_RP_NAME,
		rpID,
		userName: user.username,
		userDisplayName: user.username,
		attestationType: "none",
		excludeCredentials: user.passkeys.map((passkey) => ({
			id: passkey.id,
			transports: passkey.transports,
		})),
		authenticatorSelection: {
			residentKey: "required",
			userVerification: "discouraged",
		},
	});

	// Update session
	session.pendingChallenge = {
		challenge: options.challenge,
		rpID,
		userId: options.user.id,
	};
	if (!await db.sessionUpdate(session.id, {
		pendingChallenge: session.pendingChallenge,
	})) {
		throw new Error("Failed to update session data.");
	}

	return options;
}

export async function WebauthRegisterFinalize(db: Datastore, session: Session, user: User, expectedOrigin: string, response: RegistrationResponseJSON, dataKey: string): Promise<true> {
	if (!session.pendingChallenge?.userId) {
		throw new Error("No registration challenge in progress");
	}
	const { challenge, rpID, userId } = session.pendingChallenge;

	const result = await verifyRegistrationResponse({
		expectedChallenge: challenge,
		expectedRPID: rpID,
		expectedOrigin,
		response,
	});

	if (!result.verified || !result.registrationInfo) {
		throw new Error("Did not verify");
	}

	// Update session
	session.pendingChallenge = null;
	if (!await db.sessionUpdate(session.id, {
		pendingChallenge: null,
	})) {
		throw new Error("Failed to update session data.");
	}

	const {
		credential,
		credentialDeviceType,
		credentialBackedUp,
	} = result.registrationInfo;

	// Update user
	user.passkeys.push({
		webAuthnUserID: userId,
		id: credential.id,
		rpID,
		publicKey: BytesToBase64(credential.publicKey),
		counter: credential.counter,
		transports: credential.transports,
		deviceType: credentialDeviceType,
		backedUp: credentialBackedUp,
		dataKey,
	});
	if (!await db.userUpdate(user.username, {
		passkeys: user.passkeys,
	})) {
		throw new Error("Failed to update session data.");
	}

	return true;
}

export async function WebauthLoginInit(db: Datastore, session: Session, rpID: string): Promise<PublicKeyCredentialRequestOptionsJSON> {
	const options = await generateAuthenticationOptions({
		rpID,
		userVerification: "discouraged",
	});

	// Update session
	session.pendingChallenge = {
		challenge: options.challenge,
		rpID,
	};
	if (!await db.sessionUpdate(session.id, {
		pendingChallenge: session.pendingChallenge,
	})) {
		throw new Error("Failed to update session data.");
	}

	return options;
}

export async function WebauthLoginFinalize(db: Datastore, session: Session, expectedOrigin: string, response: AuthenticationResponseJSON): Promise<{
	user: User;
	dataKey: string;
} | null> {
	if (session.pendingChallenge == null || session.pendingChallenge.userId != null) {
		throw new Error("No login challenge in progress");
	}
	const { challenge, rpID } = session.pendingChallenge;

	const user = await db.userGetByPasskeyId(response.id, rpID);
	const credential = user?.passkeys.find((passkey) => passkey.id === response.id && passkey.rpID === rpID);

	if (user == null || credential == null)
		return null;

	const result = await verifyAuthenticationResponse({
		credential: {
			id: credential.id,
			publicKey: Base64ToBytes(credential.publicKey),
			counter: credential.counter,
			transports: credential.transports,
		},
		expectedChallenge: challenge,
		expectedRPID: rpID,
		expectedOrigin,
		response,
	});

	if (!result.verified || !result.authenticationInfo) {
		throw new Error("Did not verify");
	}

	// Update user data
	credential.counter = result.authenticationInfo.newCounter;
	if (!await db.userUpdate(user.username, {
		passkeys: user.passkeys,
	})) {
		throw new Error("Failed to update user data.");
	}

	session.pendingChallenge = null;
	session.currentUser = user.username;
	await db.sessionUpdate(session.id, {
		pendingChallenge: null,
		currentUser: user.username,
	});

	return {
		user,
		dataKey: credential.dataKey,
	};
}
