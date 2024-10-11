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
- **Backend:** Express.js, Firebase Firestore, Firebase Cloud Functions
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
   git clone https://github.com/your-username/YaleComputerSociety/yaleims.git
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

5. Start the backend server:

   - Then, start the backend server:
     ```bash
     npm run start
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

3. Set up environment variables in `.env.local` for the frontend (you can skip this for now!):
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

## Contributers 
- Anna Xu ('24.5)
- Daniel Morales ('27)
- Ephraim Akai-Nettey ('27)