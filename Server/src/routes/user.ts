import { Router } from "express";
import { cloneDeep } from "lodash-es";
import { z, ZodSchema } from "zod";
import { Datastore, User } from "../database/interface.ts";
import { CurrentUserData, UserGetDataResponse, UserUpdateDataRequest, UserUpdateDataResponse } from "./apiTypes.ts";
import { GetRequestSession } from "./session.ts";

export function UserDataToClientData(user: User): CurrentUserData {
	return {
		username: user.username,
		encryptedData: user.encryptedData,
		dataPasswordKey: user.dataPasswordKey,
		passkeys: user.passkeys.map((passkey) => ({
			id: passkey.id,
			transports: cloneDeep(passkey.transports),
		})),
	};
}

export function MakeUserRoutes(db: Datastore): Router {
	const router = Router();

	// Get user data
	router.get<"/data", object, UserGetDataResponse>("/data", async function (req, res) {
		const session = await GetRequestSession(db, req.headers);

		if (session == null) {
			res.status(400)
				.json({ result: "invalidSession" });
			return;
		}

		const user = session.currentUser != null ? (await db.userGet(session.currentUser)) : null;
		if (user == null) {
			res.status(401)
				.json({ result: "notLoggedIn" });
			return;
		}

		res.status(200)
			.json({
				result: "ok",
				userData: UserDataToClientData(user),
			});
	});

	// Update user data
	const userUpdateDataRequestSchema: ZodSchema<UserUpdateDataRequest> = z.object({
		encryptedData: z.string().optional(),
		dataPasswordKey: z.string().optional(),
	});
	router.patch<"/data", object, UserUpdateDataResponse, UserUpdateDataRequest>("/data", async function (req, res) {
		const data = userUpdateDataRequestSchema.safeParse(req.body);
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

		const user = session.currentUser != null ? (await db.userGet(session.currentUser)) : null;
		if (user == null) {
			res.status(401)
				.json({ result: "notLoggedIn" });
			return;
		}

		const dataUpdate: Partial<Omit<User, "username">> = {};
		if (data.data.encryptedData !== undefined) {
			dataUpdate.encryptedData = data.data.encryptedData;
		}
		if (data.data.dataPasswordKey !== undefined) {
			dataUpdate.dataPasswordKey = data.data.dataPasswordKey;
		}

		const result = await db.userUpdate(user.username, dataUpdate);
		if (result != null) {
			res.status(200)
				.json({
					result: "ok",
					userData: UserDataToClientData(result),
				});
		} else {
			res.status(500)
				.json({ result: "failed" });
		}
	});

	return router;
}
