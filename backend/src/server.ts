import express, { Request, Response } from 'express';
import passport from 'passport';
import { Strategy as CASStrategy } from 'passport-cas';
import session from 'express-session';
import dotenv from 'dotenv';
import cors from "cors";
import RedisStore from 'connect-redis';
// import { createClient } from 'redis';

dotenv.config();

const app = express();

// Allow cross-origin requests from your Next.js app
app.use(cors({
  origin: 'http://localhost:3000',  // Your Next.js app URL
  credentials: true
}));

const redisClient = createClient({
  socket: {
    host: '127.0.0.1',  // Redis host
    port: 6379,         // Redis port
  }
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

await redisClient.connect();

app.use((req, res, next) => {
  console.log("Session data:", req.session);
  next();
});


app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

// Add types for profile and done callback
passport.use(new CASStrategy({
  ssoBaseURL: 'https://secure.its.yale.edu/cas',
  serverBaseURL: 'http://localhost:5001/api/auth/callback'
}, async (profile: any, done: (err: any, user?: any) => void) => {
  console.log("CAS profile:", profile);
  return done(null, { netId: profile.user || profile });
}));

passport.serializeUser((user: any, done: (err: any, id?: any) => void) => {
  console.log("Serializing user:", user);  // Ensure the user has netId
  done(null, user.netId);  // Only store netId in the session
});

passport.deserializeUser((netId: string, done: (err: any, user?: any) => void) => {
  console.log("Deserializing user with netId:", netId);
  // Rebuild the user object from the netId
  done(null, { netId });
});

// CAS login route
app.get("/api/auth/login", (req, res, next) => {
  console.log("CAS login route hit");
  passport.authenticate("cas")(req, res, next);
});

// CAS callback route
app.get("/api/auth/callback", passport.authenticate("cas", { failureRedirect: '/' }), (req, res) => {
  req.session.save((err) => {
    if (err) {
      console.error("Error saving session:", err);
    }
    res.redirect("/api/auth/success");
  });
});


// Route to check if the user is logged in and return the NetID
app.get('/api/auth/session', (req: Request, res: Response) => {
  console.log("Session:", req.session);
  console.log("User:", req.user);
  if (req.isAuthenticated()) {  // Check if user is authenticated
    res.json({ netid: (req.user as any).netId });
  } else {
    res.json({ netid: null });
  }
});

// Success route after successful login
app.get('/api/auth/success', (req: Request, res: Response) => {
  console.log("User is authenticated:", req.isAuthenticated());
  if (req.isAuthenticated()) {
    res.redirect('http://localhost:3000');
  } else {
    res.redirect('/');
  }
});


const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

// Serve static HTML file
app.get("/", (req, res) => {
  res.redirect('http://localhost:3000')
});
