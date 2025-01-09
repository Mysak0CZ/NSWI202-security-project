import { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { Router } from "express";
import { IncomingHttpHeaders } from "node:http";
import { z, ZodSchema } from "zod";
import { AuthPassword, AuthRegister, WebauthLoginFinalize, WebauthLoginInit, WebauthRegisterFinalize, WebauthRegisterInit } from "../auth.ts";
import { Datastore, Session } from "../database/interface.ts";
import { SessionInitResponse, SessionLoginPasswordRequest, SessionLoginPasswordResponse, SessionLoginWebauthCompleteRequest, SessionLoginWebauthCompleteResponse, SessionLoginWebauthInitRequest, SessionLoginWebauthInitResponse, SessionRegisterRequest, SessionRegisterResponse, SessionRegisterWebauthCompleteRequest, SessionRegisterWebauthCompleteResponse, SessionRegisterWebauthInitRequest, SessionRegisterWebauthInitResponse, SessionTerminateResponse } from "./apiTypes.ts";
import { UserDataToClientData } from "./user.ts";

export async function GetRequestSession(db: Datastore, headers: IncomingHttpHeaders): Promise<Session | null> {
	const authorization = typeof headers.authorization === "string" ? headers.authorization.split(" ") : [];

	if (authorization.length !== 2 || authorization[0] !== "Token")
		return null;

	const tokenParts = authorization[1].split(":");
	if (tokenParts.length !== 2)
		return null;

	const session = await db.sessionGet(tokenParts[0]);
	if (session?.secret !== tokenParts[1])
		return null;

	return session;
}

export function MakeSessionRoutes(db: Datastore): Router {
	const router = Router();


	// Session init
	router.post<object, SessionInitResponse>("/init", async function (req, res) {
		const session = await db.sessionCreate();

		res.status(200)
			.json({
				session: `${ session.id }:${ session.secret }`,
			});
	});

	// Session logout
	router.post<object, SessionTerminateResponse>("/terminate", async function (req, res) {
		const session = await GetRequestSession(db, req.headers);

		if (session != null) {
			await db.sessionDelete(session.id);
		}

		res.status(200)
			.json({
				result: "ok",
			});
	});

	// Session register
	const sessionRegisterRequestSchema: ZodSchema<SessionRegisterRequest> = z.object({
		username: z.string().min(3).max(64),
		passwordHash: z.string().min(1),
		encryptedData: z.string(),
		dataPasswordKey: z.string(),
	});
	router.post<object, SessionRegisterResponse, SessionRegisterRequest>("/register", async function (req, res) {
		const data = sessionRegisterRequestSchema.safeParse(req.body);
		if (data.error) {
			res.status(400)
				.json({ result: "invalidData" });
			return;
		}

		const session = await GetRequestSession(db, req.headers);

		if (session == null) {
			res.status(400)
				.json({ result: "invalidSession" });
			return;
		}

		// Create a new user account
		const result = await AuthRegister(db, session, data.data);

		if (result != null) {
			res.status(200)
				.json({
					result: "ok",
					userData: UserDataToClientData(result),
				});
			return;
		} else {
			res.status(401)
				.json({ result: "userExists" });
			return;
		}
	});

	// Start registration of webauth passkey
	const sessionRegisterWebauthInitRequestSchema: ZodSchema<SessionRegisterWebauthInitRequest> = z.object({
		rpId: z.string(),
	});
	router.post<object, SessionRegisterWebauthInitResponse, SessionRegisterWebauthInitRequest>("/register/webauth/init", async function (req, res) {
		const data = sessionRegisterWebauthInitRequestSchema.safeParse(req.body);
		if (data.error) {
			res.status(400)
				.json({ result: "invalidData" });
			return;
		}

		const session = await GetRequestSession(db, req.headers);

		if (session == null) {
			res.status(400)
				.json({ result: "invalidSession" });
			return;
		}

		// Get login
		const user = session.currentUser != null ? (await db.userGet(session.currentUser)) : null;
		if (user == null) {
			res.status(401)
				.json({ result: "notLoggedIn" });
			return;
		}

		try {
			const options = await WebauthRegisterInit(db, session, user, data.data.rpId);
			res.status(200)
				.json({
					result: "ok",
					options,
				});
		} catch (error) {
			console.error("Failed to init registration:", error);
			res.status(500)
				.json({
					result: "error",
				});
		}
	});

	// Complete registration of webauth passkey
	const sessionRegisterWebauthCompleteRequestSchema: ZodSchema<SessionRegisterWebauthCompleteRequest> = z.object({
		response: z.any() as ZodSchema<RegistrationResponseJSON>,
		dataKey: z.string(),
	});
	router.post<object, SessionRegisterWebauthCompleteResponse, SessionRegisterWebauthCompleteRequest>("/register/webauth/complete", async function (req, res) {
		const data = sessionRegisterWebauthCompleteRequestSchema.safeParse(req.body);
		if (data.error) {
			res.status(400)
				.json({ result: "invalidData" });
			return;
		}

		const session = await GetRequestSession(db, req.headers);

		if (session == null) {
			res.status(400)
				.json({ result: "invalidSession" });
			return;
		}

		// Get login
		const user = session.currentUser != null ? (await db.userGet(session.currentUser)) : null;
		if (user == null) {
			res.status(401)
				.json({ result: "notLoggedIn" });
			return;
		}

		// Complete the registration

		try {
			await WebauthRegisterFinalize(db, session, user, req.headers.origin ?? "", data.data.response, data.data.dataKey);
			res.status(200)
				.json({
					result: "ok",
					userData: UserDataToClientData(user),
				});
		} catch (error) {
			console.error("Failed to complete registration:", error);
			res.status(500)
				.json({
					result: "error",
				});
		}
	});

	// Session login - password
	const sessionLoginPasswordRequestSchema: ZodSchema<SessionLoginPasswordRequest> = z.object({
		username: z.string(),
		passwordHash: z.string(),
	});
	router.post<object, SessionLoginPasswordResponse, SessionLoginPasswordRequest>("/login/password", async function (req, res) {
		const data = sessionLoginPasswordRequestSchema.safeParse(req.body);
		if (data.error) {
			res.sendStatus(400);
			return;
		}

		const session = await GetRequestSession(db, req.headers);

		if (session == null) {
			res.status(400)
				.json({ result: "invalidSession" });
			return;
		}

		// Get user account
		const result = await AuthPassword(db, session, data.data.username, data.data.passwordHash);

		if (result != null) {
			res.status(200)
				.json({
					result: "ok",
					userData: UserDataToClientData(result),
				});
			return;
		} else {
			res.status(401)
				.json({ result: "invalidCredentials" });
			return;
		}
	});

	// Start login with webauth passkey
	const sessionLoginWebauthInitRequestSchema: ZodSchema<SessionLoginWebauthInitRequest> = z.object({
		rpId: z.string(),
	});
	router.post<object, SessionLoginWebauthInitResponse, SessionLoginWebauthInitRequest>("/login/webauth/init", async function (req, res) {
		const data = sessionLoginWebauthInitRequestSchema.safeParse(req.body);
		if (data.error) {
			res.status(400)
				.json({ result: "invalidData" });
			return;
		}

		const session = await GetRequestSession(db, req.headers);
		if (session == null) {
			res.status(400)
				.json({ result: "invalidSession" });
			return;
		}

		// Start the flow
		try {
			const options = await WebauthLoginInit(db, session, data.data.rpId);
			res.status(200)
				.json({
					result: "ok",
					options,
				});
		} catch (error) {
			console.error("Failed to init login:", error);
			res.status(500)
				.json({
					result: "error",
				});
		}
	});

	// Complete login with webauth passkey
	const sessionLoginWebauthCompleteRequestSchema: ZodSchema<SessionLoginWebauthCompleteRequest> = z.object({
		response: z.any() as ZodSchema<AuthenticationResponseJSON>,
	});
	router.post<object, SessionLoginWebauthCompleteResponse, SessionLoginWebauthCompleteRequest>("/login/webauth/complete", async function (req, res) {
		const data = sessionLoginWebauthCompleteRequestSchema.safeParse(req.body);
		if (data.error) {
			res.status(400)
				.json({ result: "invalidData" });
			return;
		}

		const session = await GetRequestSession(db, req.headers);
		if (session == null) {
			res.status(400)
				.json({ result: "invalidSession" });
			return;
		}

		// Try to complete the login
		try {
			const result = await WebauthLoginFinalize(db, session, req.headers.origin ?? "", data.data.response);
			if (result == null) {
				res.status(403)
					.json({
						result: "invalidCredentials",
					});
				return;
			}
			res.status(200)
				.json({
					result: "ok",
					userData: UserDataToClientData(result.user),
					dataKey: result.dataKey,
				});
		} catch (error) {
			console.error("Failed to complete login:", error);
			res.status(500)
				.json({
					result: "invalidCredentials",
				});
		}
	});

	return router;
}
