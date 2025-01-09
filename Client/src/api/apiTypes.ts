import { AuthenticationResponseJSON, AuthenticatorTransportFuture, PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON, RegistrationResponseJSON } from "@simplewebauthn/browser";

export type CurrentUserData = {
	username: string;
	encryptedData: string;
	dataPasswordKey: string;
	passkeys: {
		id: string;
		transports?: AuthenticatorTransportFuture[];
	}[];
};

// Session init
// POST /session/init
// Empty request
export type SessionInitResponse = {
	session: string;
};

// Session logout
// POST /session/terminate
// Requires "Authorization" header with session identifier
// Empty request
export type SessionTerminateResponse = {
	result: "ok";
};

// Session register
// POST /session/register
// Requires "Authorization" header with session identifier
export type SessionRegisterRequest = {
	username: string;
	passwordHash: string;
	encryptedData: string;
	dataPasswordKey: string;
};
export type SessionRegisterResponse = {
	result: "ok";
	userData: CurrentUserData;
} | {
	result: "invalidSession" | "invalidData" | "userExists";
};

// Start registration of webauth passkey
// POST /session/register/webauth/init
// Requires "Authorization" header with session identifier
export type SessionRegisterWebauthInitRequest = {
	rpId: string;
};
export type SessionRegisterWebauthInitResponse = {
	result: "ok";
	options: PublicKeyCredentialCreationOptionsJSON;
} | {
	result: "invalidData" | "invalidSession" | "notLoggedIn" | "error";
};

// Complete registration of webauth passkey
// POST /session/register/webauth/complete
// Requires "Authorization" header with session identifier
export type SessionRegisterWebauthCompleteRequest = {
	response: RegistrationResponseJSON;
	dataKey: string;
};
export type SessionRegisterWebauthCompleteResponse = {
	result: "ok";
	userData: CurrentUserData;
} | {
	result: "invalidData" | "invalidSession" | "notLoggedIn" | "error";
};


// Session login - password
// POST /session/login/password
// Requires "Authorization" header with session identifier
export type SessionLoginPasswordRequest = {
	username: string;
	passwordHash: string;
};
export type SessionLoginPasswordResponse = {
	result: "ok";
	userData: CurrentUserData;
} | {
	result: "invalidSession" | "invalidCredentials";
};

// Start registration of webauth passkey
// POST /session/login/webauth/init
// Requires "Authorization" header with session identifier
export type SessionLoginWebauthInitRequest = {
	rpId: string;
};
export type SessionLoginWebauthInitResponse = {
	result: "ok";
	options: PublicKeyCredentialRequestOptionsJSON;
} | {
	result: "invalidData" | "invalidSession" | "error";
};

// Complete registration of webauth passkey
// POST /session/login/webauth/complete
// Requires "Authorization" header with session identifier
export type SessionLoginWebauthCompleteRequest = {
	response: AuthenticationResponseJSON;
};
export type SessionLoginWebauthCompleteResponse = {
	result: "ok";
	userData: CurrentUserData;
	dataKey: string;
} | {
	result: "invalidData" | "invalidSession" | "invalidCredentials";
};

// Get user data
// GET /user/data
// Requires "Authorization" header with session identifier
// Empty request
export type UserGetDataResponse = {
	result: "ok";
	userData: CurrentUserData;
} | {
	result: "invalidSession" | "notLoggedIn";
};

// Update user data
// PATCH /user/data
// Requires "Authorization" header with session identifier
export type UserUpdateDataRequest = {
	encryptedData?: string;
	dataPasswordKey?: string;
};
export type UserUpdateDataResponse = {
	result: "ok";
	userData: CurrentUserData;
} | {
	result: "invalidSession" | "notLoggedIn" | "failed";
};
