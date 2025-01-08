import express from "express";
import * as fs from "fs";
import { Server as NodeHttpServer } from "node:http";
import { Server as NodeHttpsServer } from "node:https";
import { HTTP_PORT, HTTP_SSL_CERT, HTTP_SSL_KEY } from "./config.ts";
import { Datastore } from "./database/interface.ts";
import { SetupExpressRoutes } from "./routes/index.ts";

export class HttpServer {
	private _server?: NodeHttpServer;

	public async start(db: Datastore): Promise<void> {
		const app = express()
			.disable("x-powered-by");

		// Setup http(s) server
		if (HTTP_SSL_CERT || HTTP_SSL_KEY) {
			let certData: string;
			try {
				certData = fs.readFileSync(HTTP_SSL_CERT, { encoding: "utf-8" });
			} catch (e) {
				throw new Error("Failed to read HTTP_SSL_CERT file", { cause: e });
			}
			let keyData: string;
			try {
				keyData = fs.readFileSync(HTTP_SSL_KEY, { encoding: "utf-8" });
			} catch (e) {
				throw new Error("Failed to read HTTP_SSL_KEY file", { cause: e });
			}
			this._server = new NodeHttpsServer({
				cert: certData,
				key: keyData,
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
			}, app);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			this._server = new NodeHttpServer(app);
		}
		// Setup routes
		const server = this._server;
		SetupExpressRoutes(app, db);
		// Start the server
		return new Promise((resolve, reject) => {
			server.once("error", reject);
			server.listen(HTTP_PORT, () => {
				server.off("error", reject);
				server.on("error", (err) => {
					console.error("HTTP server error:", err);
				});
				console.log(`HTTP server listening on ${ HTTP_PORT }`);
				resolve();
			});
		});
	}

	public stop(): void {
		if (this._server) {
			this._server.unref();
			this._server.close((err) => {
				if (err) {
					console.error("Failed to close HTTP server:", err);
				} else {
					console.log("HTTP server closed");
				}
			});
		}
	}
}
