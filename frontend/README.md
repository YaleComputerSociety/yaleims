# frontend — the YaleIMs app

The Next.js app: pages and the API routes (the whole server). Setup, the
code map and the conventions are in the [README](../README.md) at the repo
root; how-tos in [CONTRIBUTING.md](../CONTRIBUTING.md); tests in
[tests/README.md](tests/README.md).

| Command | What |
|---|---|
| `npm run emulator` | The Firestore emulator (needs Java 21), with `../database`'s rules |
| `npm run seed` | Loads the synthetic seed into the emulator (wipes it first; needs `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`) |
| `npm run dev:emulator` | The app on the emulator, http://localhost:3000 |
| `npm run dev:token -- <email>` | Sign in locally as a seeded person (prints a line for the browser console) |
| `npm run make-admin -- <email>` | Give someone in the emulator the admin and dev roles (e.g. you, after a local CAS login) |
| `npm run typecheck`, `npm run lint`, `npm test` | Types, lint, unit tests |
| `npm run test:integration` | API and rules tests against the emulator (reseeds it) |
| `npm run build`, `npm start` | Production build and server |

Settings: `.env.local` for local development (start from `.env.example`);
`apphosting.yaml` for production (values and Secret Manager references).
