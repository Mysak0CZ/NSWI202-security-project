export type CurrentUserData = {
	username: string;
	encryptedData: string;
	dataPasswordKey: string;
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
