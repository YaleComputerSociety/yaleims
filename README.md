# Yale Intramural Sports App

This project is a web application designed to manage and track Yale's intramural sports events. The app offers users a range of features, including:

- Checking leaderboards to track standings
- Accessing scores and reviewing game schedules
- Adding events directly to your Google Calendar
- Exploring college overviews to see detailed insights about different teams

Additionally, the app allows for real-time updates and scoring of games, keeping all participants and spectators up-to-date.



## Table of Contents

- [Yale Intramural Sports App](#yale-intramural-sports-app)
  - [Table of Contents](#table-of-contents)
  - [Contribution Guide](#contribution-guide)
  - [Tech Stack](#tech-stack)
  - [Installation](#installation)
    - [Prerequisites](#prerequisites)
    - [Backend Setup](#backend-setup)
    - [Frontend Setup](#frontend-setup)
  - [Project Structure](#project-structure)
  - [Main Contributers](#main-contributers)

## Contribution Guide

First, read this ReadMe in its entirety (you're off to a good start). Generally, people who contribute are part of the y/cs. If you have a contribution you want to make, but you are not part of the yims team within the y/cs, we welcome you to open a Pull Request. You can either solve an open issue that has not been assigned to someone, or contribute a new feature of your design. A successfully merged PR of significant contribution will earn you implicit membership in the org. You will be credited on the site.

If you wish to design your own feature, we encourage you to reach out to the yims team first at yalecomputersociety@gmail.com, as we reserve the right to reject any contributions we are not consulted on.

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** Next.js API routes, Firebase Firestore
- **Authentication:** Firebase Authentication
- **Database:** Firebase Firestore
- **Deployment:** Firebase Hosting

## Installation

### Prerequisites

- Node.js (v16+)
- Firebase account
- Yale CAS setup for authentication

### Backend

There is no separate backend: the server code is the Next.js app's API
routes (`frontend/src/app/api`), backed by Firestore. Firestore rules and
indexes live in `database/`.

### Frontend Setup

1. Clone the repository and go to the frontend folder:

   ```bash
   git clone https://github.com/YaleComputerSociety/yaleims.git
   cd yaleims/frontend
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables in `.env.local` for the frontend:

   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   ...
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## Project Structure

'./frontend/src/app/api': The server: Next.js API routes that read and write Firestore.

'./sidelined/elo': Switched-off Elo ratings code, kept for future use (see its README).

'yaleims/frontend/src': Houses all the React components for the different pages of the web app.

'yaleims/frontend/src/app': Houses the routing for the general page layouts.

The Web App is broken down into **8 general pages** with their supporting components stored under the corresponding folder in 'yaleims/frontend/src/components'. 

   - [./About]
   - [./AddScores] (Special page only visible to admin, achieved with 'withProtectedRoute.tsx')
   - [./faq]
   - [./Home]
   - [./Profile]
   - [./Schedule]
   - [./Scores]

There are also additional typescript components ('Footer.tsx', 'LoadingScreen.tsx', and 'NavBar.tsx') that are used throughout the app

'./src/context': Holds contexts that allow for themes to be maintained across renderings (Filtering, Themes, or Users Info)

'./src/hooks': Holds GCal and CAS Login integration

'./src/types' and './src/utils': Hold interfaces and types to used throughout the app

## Main Contributers

- Daniel Morales ('27)
- Ephraim Akai-Nettey ('27)
- Kaitlyn Oikle ('27)
- Brian Di Bassinga ('26)
- Vojtech Kysilka ('28)
- Farhan Baig ('27)
- Ella White ('27)
- Claire Guo ('29)
- Ben Le ('29)
>>>>>>> main
