import express, {Request, Response} from "express";

export default class PingPongRouter {
	getRouter = () => {
		const router = express.Router();
		router.get("/", this.pingPong);
		return router;
	}

	pingPong = (req: Request, res: Response) => {
		res.send("pong");
	}
};