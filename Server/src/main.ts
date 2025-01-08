import { InMemoryDatabase } from "./database/inMemory.ts";
import { Datastore } from "./database/interface.ts";
import { HttpServer } from "./httpServer.ts";

Run()
	.catch((error) => {
		console.error("Run failed:", error);
		process.exit(1);
	});

let Db: Datastore | undefined;
let Server: HttpServer | undefined;

// eslint-disable-next-line @typescript-eslint/require-await
async function InitDb(): Promise<Datastore> {
	return new InMemoryDatabase();
}

export async function Run(): Promise<void> {
	console.log("Starting...");

	Db = await InitDb();

	Server = new HttpServer();
	await Server.start(Db);
}
