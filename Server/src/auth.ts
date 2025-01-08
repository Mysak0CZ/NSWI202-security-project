import * as argon2 from "argon2";
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
