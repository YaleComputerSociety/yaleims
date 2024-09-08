# Yale Intramural Sports App

This project is a web application for managing and tracking Yale's intramural sports events. The app provides users with features such as viewing profiles, checking leaderboards, accessing scores, and reviewing game schedules. It is built with a modern tech stack to ensure ease of use, scalability, and maintainability.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** Express.js, Firebase Firestore
- **Authentication:** Yale CAS Login
- **Database:** Firebase Firestore
- **Deployment:** 

## Features

- **Profile Pages:** View personal profiles with information such as netid, name, college, role (player, referee, secretary, or admin), and personal points.
- **Leaderboard:** Check the overall rankings and points of colleges participating in intramural sports.
- **Scores:** View detailed scores and match results, with a filterable table highlighting winners, losers, and tied games.
- **Schedule:** See upcoming and past matches in both list and calendar views, with options to sign up for games.

## Installation

### Prerequisites

- Node.js (v16+)
- Firebase account
- Yale CAS setup for authentication

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/yaleims.git
   cd backend
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Set up Firebase:
   - Create a Firebase project and enable Firestore.
   - Add your Firebase credentials in a `.env` file:
     ```bash
     FIREBASE_API_KEY=your_firebase_api_key
     FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
     FIREBASE_PROJECT_ID=your_project_id
     ```

4. Set up Yale CAS for authentication:
   - Configure the `passport-cas` middleware in the backend.
   - Add your CAS configuration to the `.env` file:
     ```bash
     CAS_URL=https://secure.its.yale.edu/cas
     ```

5. Start the backend server:
   ```bash
   npm start
   ```

### Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env.local` for the frontend:
   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## Usage

- Users can log in via Yale CAS.
- Once logged in, users can view their profile, check their college's leaderboard standings, and browse match schedules and results.
- Admins, secretaries, and referees can score matches and manage data related to intramural sports.

Here's an updated version of your **Project Structure** section based on the screenshot and folder layout:

```markdown
## Project Structure

```
yaleims/
├── backend/                 # Express.js backend with Firebase and Redis integration
│   ├── @types/              # Custom TypeScript type definitions
│   ├── database/            # Database setup and Firestore interaction logic
│   ├── dist/                # Compiled TypeScript output (after build)
│   ├── src/                 # Source code for Express server
│   │   ├── server.ts        # Main server file
│   ├── package.json         # Backend package configuration
│   ├── tsconfig.json        # TypeScript configuration for backend
│   └── README.md            # Backend-specific documentation
├── frontend/                # Next.js frontend
│   ├── public/              # Static assets (e.g., images, fonts, etc.)
│   ├── src/                 # Source code for the frontend
│   │   ├── components/      # Reusable React components
│   │   ├── pages/           # Next.js pages (Home, Profile, Scores, etc.)
│   ├── .eslintrc.json       # ESLint configuration for frontend
│   ├── next.config.mjs      # Next.js configuration file
│   ├── package.json         # Frontend package configuration
│   ├── tailwind.config.ts   # Tailwind CSS configuration
│   └── README.md            # Frontend-specific documentation
└── README.md                # Project-level documentation
```
