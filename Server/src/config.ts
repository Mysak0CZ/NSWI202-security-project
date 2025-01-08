import { Assert } from "./utilities.ts";

export const HTTP_PORT: number = 8084;
export const HTTP_SSL_CERT: string = "";
export const HTTP_SSL_KEY: string = "";

Assert((!HTTP_SSL_CERT) === (!HTTP_SSL_KEY), "Either none or both of HTTP_SSL_CERT and HTTP_SSL_KEY need to be defined");
