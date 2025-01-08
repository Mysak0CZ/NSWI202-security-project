import React, { ReactElement, useState } from "react";
import { LoginForm } from "./login.js";
import { RegisterForm } from "./register.js";

const AuthPages = {
	login: LoginForm,
	register: RegisterForm,
} as const;

export interface AuthPageProps {
	setPage: (newPage: AuthPage) => void;
}

export type AuthPage = keyof typeof AuthPages;

export function AuthRouter(): ReactElement {
	const [page, setPage] = useState<AuthPage>("login");

	// eslint-disable-next-line @typescript-eslint/naming-convention
	const Component = AuthPages[page];

	return (
		<div className="centerbox flex-1">
			<div className="authForm col">
				<Component setPage={ setPage } />
			</div>
		</div>
	);
}
