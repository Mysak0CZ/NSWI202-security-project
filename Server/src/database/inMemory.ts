import { cloneDeep } from "lodash-es";
import { nanoid } from "nanoid";
import { Assert } from "../utilities.ts";
import { Datastore, Session, User } from "./interface.ts";

export class InMemoryDatabase implements Datastore {
	private _sessions = new Map<string, Session>();
	private _users = new Map<string, User>();

	//#region Session management
	sessionCreate(): Promise<Session> {
		const id = nanoid();
		Assert(!this._sessions.has(id));

		const data: Session = {
			id,
			secret: nanoid(),
			currentUser: null,
			started: Date.now(),
		};
		this._sessions.set(id, data);

		return Promise.resolve(cloneDeep(data));
	}

	sessionGet(id: string): Promise<Session | null> {
		const session = this._sessions.get(id) ?? null;

		return Promise.resolve(cloneDeep(session));
	}

	sessionUpdate(id: string, data: Partial<Omit<Session, "id">>): Promise<boolean> {
		const currentData = this._sessions.get(id);
		if (currentData == null)
			return Promise.resolve(false);

		const newData: Session = {
			...currentData,
			...data,
			id,
		};
		this._sessions.set(id, newData);

		return Promise.resolve(true);
	}

	sessionDelete(id: string): Promise<void> {
		this._sessions.delete(id);

		return Promise.resolve();
	}
	//#endregion

	//#region User management
	userRegister(data: User): Promise<boolean> {
		const key = data.username.toLowerCase();
		if (this._users.has(key))
			return Promise.resolve(false);

		this._users.set(key, data);

		return Promise.resolve(true);
	}

	userGet(username: string): Promise<User | null> {
		const key = username.toLowerCase();
		const user = this._users.get(key) ?? null;

		return Promise.resolve(cloneDeep(user));
	}

	userUpdate(username: string, data: Partial<Omit<User, "username">>): Promise<User | null> {
		const key = username.toLowerCase();

		const currentData = this._users.get(key);
		if (currentData == null)
			return Promise.resolve(null);

		const newData: User = {
			...currentData,
			...data,
			username: currentData.username,
		};
		this._users.set(key, newData);

		return Promise.resolve(cloneDeep(newData));
	}

	userDelete(username: string): Promise<void> {
		const key = username.toLowerCase();
		this._users.delete(key);

		return Promise.resolve();
	}
	//#endregion
}
