import express from "express";
import PingPongRouter from "./routes/pingPongRouter.js";
import CasRouter from "./routes/casRouter.js";
import passport from "passport";
import session from "express-session";
export default class WebServer {
    #app;
    constructor() {
        this.initializeExpress();
        this.initializeSubRouters();
        this.serve();
    }
    initializeExpress = () => {
        this.#app = express();
        this.#app.set("trust proxy", 1);
        this.#app.use(express.json());
        this.#app.use(express.urlencoded({ extended: true }));
        this.#app.use(session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: true,
            cookie: {
                httpOnly: true,
                // Restrict to HTTPS only in prod
                secure: process.env.NODE_ENV !== "development",
                // 400 days, the max age that Chrome supports
                maxAge: 34560000,
            },
            // TODO: You can add a `store` option here to commit sessions
            // to a database. Add this once the DB is set up
        }));
        this.#app.use(passport.initialize());
        this.#app.use(passport.session());
    };
    initializeSubRouters = () => {
        const pingPongRouter = new PingPongRouter();
        this.#app.use("/ping", pingPongRouter.getRouter());
        const casRouter = new CasRouter();
        this.#app.use("/login", casRouter.getRouter());
    };
    serve = () => {
        this.#app.listen(process.env.PORT, () => {
            console.log(`App running on port ${process.env.PORT}`);
        });
    };
}
//# sourceMappingURL=webServer.js.map