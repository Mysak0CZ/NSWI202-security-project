import { SessionInitResponse, SessionLoginPasswordRequest, SessionLoginPasswordResponse, SessionRegisterRequest, SessionRegisterResponse, SessionTerminateResponse, UserGetDataResponse, UserUpdateDataRequest, UserUpdateDataResponse } from "./apiTypes.js";

export class ServerApi {
	public readonly baseAddress: string;

	constructor(baseAddress: string) {
		if (!baseAddress.endsWith("/")) {
			baseAddress += "/";
		}

		this.baseAddress = baseAddress;
	}

	sessionInit(): Promise<SessionInitResponse> {
		return this._fetch<SessionInitResponse>("session/init", "POST", undefined, {});
	}

	sessionTerminate(session: string): Promise<SessionTerminateResponse> {
		return this._fetch<SessionTerminateResponse>("session/terminate", "POST", session, {});
	}

	sessionLoginPassword(session: string, data: SessionLoginPasswordRequest): Promise<SessionLoginPasswordResponse> {
		return this._fetch<SessionLoginPasswordResponse>("session/login/password", "POST", session, data);
	}

	sessionRegister(session: string, data: SessionRegisterRequest): Promise<SessionRegisterResponse> {
		return this._fetch<SessionRegisterResponse>("session/register", "POST", session, data);
	}

	userDataGet(session: string): Promise<UserGetDataResponse> {
		return this._fetch<UserGetDataResponse>("user/data", "GET", session);
	}

	userDataUpdate(session: string, update: UserUpdateDataRequest): Promise<UserUpdateDataResponse> {
		return this._fetch<UserUpdateDataResponse>("user/data", "PATCH", session, update);
	}

	private async _fetch<TResponse>(endpoint: string, method: string, session: string | undefined, body?: unknown): Promise<TResponse> {
		return await fetch(this.baseAddress + endpoint, {
			mode: "cors",
			method,
			headers: {
				"Accept": "application/json",
				"Content-Type": "application/json",
				"Authorization": session ? `Token ${ session }` : "",
			},
			body: body ? JSON.stringify(body) : undefined,
		})
			.then((res) => res.json() as Promise<TResponse>);
	}
}
