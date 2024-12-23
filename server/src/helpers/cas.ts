import { Request, Response, NextFunction } from "express";
import passport from "passport";
<<<<<<< HEAD:backend/src/helpers/cas.ts
import { Strategy } from "passport-cas";

=======
import { Strategy } from "@coursetable/passport-cas";
>>>>>>> 6f7308f97cb09a70a6e206569055424bea0bbc8b:server/src/helpers/cas.ts
export default class CAS {
	constructor() {
		this.initializePassport();
	}

	initializePassport = () => {
		passport.use(
			new Strategy(
				{
					version: "CAS2.0",
					ssoBaseURL: "https://secure.its.yale.edu/cas",
				},
<<<<<<< HEAD:backend/src/helpers/cas.ts
				async (profile, done) => {
=======
				async (profile: any, done: any) => {
>>>>>>> 6f7308f97cb09a70a6e206569055424bea0bbc8b:server/src/helpers/cas.ts
					return done(null, { netId: profile.user });
				},
			),
		);
		passport.serializeUser((user, done) => {
			done(null, user);
		});
		passport.deserializeUser((user, done) => {
			done(null, user);
		});
	};

	static requireAuthentication = (req: Request, res: Response, next: NextFunction) => {
		console.log(req.user);
		if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
		// TODO: We need to check if the user is an undergraduate student. Otherwise, deny them access 
		return next();
	};
}