import express from "express";
export default class PingPongRouter {
    getRouter = () => {
        const router = express.Router();
        router.get("/", this.pingPong);
        return router;
    };
    pingPong = (req, res) => {
        res.send("pong");
    };
}
;
//# sourceMappingURL=pingPongRouter.js.map