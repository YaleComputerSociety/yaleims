# Yale Intramural Sports App

This project is a web application designed to manage and track Yale's intramural sports events. The app offers users a range of features, including:

- Checking leaderboards to track standings
- Accessing scores and reviewing game schedules
- Adding events directly to your Google Calendar
- Exploring college overviews to see detailed insights about different teams

Additionally, the app allows for real-time updates and scoring of games, keeping all participants and spectators up-to-date.



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
- **Backend:** Firebase Firestore, Firebase Cloud Functions
- **Authentication:** Firebase Authentication
- **Database:** Firebase Firestore
- **Deployment:** Firebase Hosting

## Installation

### Prerequisites

- Node.js (v16+)
- Firebase account
- Yale CAS setup for authentication

### Backend Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/YaleComputerSociety/yaleims.git
   cd database/functions
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

4. Start the backend server:

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

## Contributers

- Anna Xu ('24.5)
- Daniel Morales ('27)
- Ephraim Akai-Nettey ('27)
- Kaitlyn Oikle ('27)
- Brian Di Bassinga ('26)
