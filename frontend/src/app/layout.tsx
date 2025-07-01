"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "@src/components/NavBar"; // Adjust path accordingly
import { GoogleOAuthProvider } from "@react-oauth/google";
import { UserProvider } from "@src/context/UserContext";
import { SignInProvider } from "@src/context/SignInContext";
import FiltersProvider from "@src/context/FiltersContext";
import { ThemeProvider } from "@src/context/ThemeContext";
import Footer from "@src/components/Footer";
import { initAnalytics } from "../../lib/firebase";
import React from "react";

// tiny client island declared right here
function AnalyticsInit() {
  "use client";                      // ← turns just this function into a Client Component
  React.useEffect(() => {
    initAnalytics();                 // fire-and-forget
  }, []);
  return null;
}

const CLIENT_ID =
  "683055403263-8nk173ne786mjmhicqmuod2ufmcdnnec.apps.googleusercontent.com";
const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider>
      <SignInProvider>
        <UserProvider>
          <FiltersProvider>
              <GoogleOAuthProvider clientId={CLIENT_ID}>
                <html lang="en">
                  <head>
                    <title>Yale IMs</title>
                    <link rel="icon" href="/favicon.ico" />
                    <meta property="og:title" content="Yale IMs" />
                  </head>

                  <body className={`${inter.className} min-h-screen`}>
                    <AnalyticsInit />
                    <NavBar />
                    <div className="mb-10"></div>
                    {children}
                    <Footer />
                  </body>
                </html>
              </GoogleOAuthProvider>
          </FiltersProvider>
        </UserProvider>
      </SignInProvider>
    </ThemeProvider>
  );
}
