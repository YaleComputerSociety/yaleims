# THIS IS NOT USED. THIS IS OLD. DON'T BE FOOLED!

# Yale Intramural Sports Backend

This is the backend server for the Yale Intramural Sports application. It handles authentication via Yale CAS, session management using Redis, and serves various API endpoints to support the frontend.

## Tech Stack

- **Backend Framework:** Express.js
- **Authentication:** Passport.js with CAS Strategy
- **Session Management:** Express-session with Redis store
- **Database:** Firebase (for data related to users, matches, colleges, etc.)
- **Other:** CORS for cross-origin requests

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [License](#license)

## Features

- **Authentication:** Yale CAS login integration using Passport.js.
- **Session Management:** Sessions are stored in Redis for persistence and scalability.
- **API Routes:** Several routes for handling user authentication and session checks.
- **CORS:** Supports cross-origin requests to the Next.js frontend.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/yaleims.git
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Redis:
   - Install and run Redis on your local machine or configure it to connect to a Redis cloud service.

4. Set up environment variables:
   Create a `.env` file in the `backend` folder and add the following:

   ```bash
   SESSION_SECRET=your-secret-key
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   ```

5. Start the backend server:
   ```bash
   npm run build
   npm run start
   ```

The server will run at `http://localhost:5001`.

Sure! Here's an updated section of the `README.md` that includes instructions for installing and running Redis using Homebrew:

```markdown
## Redis Setup

### Installing Redis (macOS)

For local development, you'll need to install Redis on your machine. If you're using macOS, you can easily install Redis via Homebrew.

1. Install Homebrew (if you haven't already):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. Install Redis using Homebrew:
   ```bash
   brew install redis
   ```

3. Start the Redis server (developers you can skip this for now!):
   ```bash
   redis-server
   ```

   This will start the Redis server on the default port (`6379`). You should see output confirming that the Redis server is up and running.

4. (Optional) To have Redis automatically start on login:
   ```bash
   brew services start redis
   ```

5. To check if Redis is running, you can use:
   ```bash
   redis-cli ping
   ```

   If Redis is running, you should see a response: `PONG`.

### Using Redis with the Backend

Once Redis is installed and running, your backend will be able to use Redis for session management. The `redisClient` in your `server.ts` connects to Redis using the following configuration:

```typescript
const redisClient = createClient({
  socket: {
    host: '127.0.0.1',  // Redis host
    port: 6379,         // Redis port
  }
});
```

Make sure Redis is running before starting the backend server.

### CAS Authentication

Users can log in via the Yale CAS system by visiting `/api/auth/login`. Upon successful login, the user will be redirected to the frontend with their session information stored in Redis.

## API Endpoints

### Authentication Routes

- **`/api/auth/login`**  
  Initiates the Yale CAS login process.

- **`/api/auth/callback`**  
  The CAS callback route. After successful authentication, the user is redirected to `/api/auth/success`.

- **`/api/auth/success`**  
  Route after successful CAS login. Redirects the user to the frontend at `http://localhost:3000`.

- **`/api/auth/session`**  
  Returns the user's `netId` if authenticated. Example response:
  ```json
  {
    "netid": "abc123"
  }
  ```

### General Routes

- **`/`**  
  Redirects to the frontend application at `http://localhost:3000`.

## License

This project is licensed under the MIT License. See the `LICENSE` file for more details.
