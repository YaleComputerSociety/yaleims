import {configDotenv} from "dotenv";
import WebServer from "./helpers/webServer.js";
import CAS from "./helpers/cas.js";

configDotenv();

if(process.env.NODE_ENV === "development") console.log("******\nRunning in development mode.\n******\n\n");

new CAS();
new WebServer();