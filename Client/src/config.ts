/* eslint-disable @typescript-eslint/naming-convention */
declare const process: {
	env: {
		SERVER_ADDRESS: string;
	};
};

export const SERVER_ADDRESS: string = process.env.SERVER_ADDRESS;
