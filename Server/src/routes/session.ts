import { Router } from "express";
import { IncomingHttpHeaders } from "node:http";
import { z, ZodSchema } from "zod";
import { AuthPassword, AuthRegister } from "../auth.ts";
import { Datastore, Session } from "../database/interface.ts";
import { SessionInitResponse, SessionLoginPasswordRequest, SessionLoginPasswordResponse, SessionRegisterRequest, SessionRegisterResponse, SessionTerminateResponse } from "./apiTypes.ts";
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

	return router;
}
