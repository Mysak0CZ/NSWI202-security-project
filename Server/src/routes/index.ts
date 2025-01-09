import * as express from "express";
import { Datastore } from "../database/interface.ts";
import { MakeSessionRoutes } from "./session.ts";
import { MakeUserRoutes } from "./user.ts";

export function SetupExpressRoutes(app: express.Application, db: Datastore): void {
	app.use(express.json());

	app.use(function (req, res, next) {
		res.header("Access-Control-Allow-Origin", req.get("Origin") || "*");
		res.header("Access-Control-Allow-Credentials", "true");
		res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
		res.header("Access-Control-Expose-Headers", "Content-Length");
		res.header("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-Requested-With, Range");

		// Allow hosting server on a local machine
		if (req.headers["access-control-request-private-network"]) {
			res.header("Access-Control-Allow-Private-Network", "true");
		}

		if (req.method === "OPTIONS") {
			res.send(200);
		} else {
			next();
		}
	});

	app.use("/session", MakeSessionRoutes(db));
	app.use("/user", MakeUserRoutes(db));
}
