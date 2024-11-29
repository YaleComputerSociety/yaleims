import * as functions from 'firebase-functions';
import next from 'next';  // Correctly import the default export from the 'next' module
import { Request, Response } from 'express';

// Set up Next.js with SSR
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });  // Create an instance of Next.js app
const handle = app.getRequestHandler();  // Get the request handler for SSR

// Firebase function to handle SSR requests
export const nextApp = functions.https.onRequest((req: Request, res: Response) => {
  app.prepare().then(() => {
    return handle(req, res);  // Pass the request to the Next.js handler
  });
});
