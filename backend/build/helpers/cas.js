import passport from "passport";
import { Strategy } from "passport-cas";
export default class CAS {
    constructor() {
        this.initializePassport();
    }
    initializePassport = () => {
        passport.use(new Strategy({
            version: "CAS2.0",
            ssoBaseURL: "https://secure.its.yale.edu/cas",
        }, async (profile, done) => {
            return done(null, { netId: profile.user });
        }));
        passport.serializeUser((user, done) => {
            done(null, user);
        });
        passport.deserializeUser((user, done) => {
            done(null, user);
        });
    };
    static requireAuthentication = (req, res, next) => {
        console.log(req.user);
        if (!req.isAuthenticated())
            return res.status(401).json({ message: "Unauthorized" });
        // TODO: We need to check if the user is an undergraduate student. Otherwise, deny them access 
        return next();
    };
}
//# sourceMappingURL=cas.js.map