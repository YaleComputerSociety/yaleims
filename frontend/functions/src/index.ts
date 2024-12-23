import * as functions from 'firebase-functions';
import next from 'next';

// Set up Next.js with SSR
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Firebase function to handle SSR requests
export const nextApp = functions.https.onRequest((req, res) => {
  app.prepare().then(() => {
    return handle(req, res);  // Pass the request to the Next.js handler
  }).catch((err) => {
    console.error('Error during SSR setup:', err);
    res.status(500).send('Internal Server Error');
  });
});
