import { Assert } from "./utilities.ts";

export const HTTP_PORT: number = process.env.HTTP_PORT ? Number.parseInt(process.env.HTTP_PORT) : 8084;
export const HTTP_SSL_CERT: string = process.env.HTTP_SSL_CERT || "";
export const HTTP_SSL_KEY: string = process.env.HTTP_SSL_KEY || "";

Assert((!HTTP_SSL_CERT) === (!HTTP_SSL_KEY), "Either none or both of HTTP_SSL_CERT and HTTP_SSL_KEY need to be defined");

export const WEBAUTH_RP_NAME = "Encrypted notepad DEMO";
