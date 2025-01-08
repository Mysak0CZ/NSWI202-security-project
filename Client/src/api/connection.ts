import { SERVER_ADDRESS } from "../config.js";
import { ServerApi } from "./serverApi.js";

export const ServerApiConnection = new ServerApi(SERVER_ADDRESS);
