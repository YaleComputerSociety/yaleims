"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "@src/components/NavBar"; // Adjust path accordingly
import { GoogleOAuthProvider } from "@react-oauth/google";
import { UserProvider } from "@src/context/UserContext";
import FiltersProvider from "@src/context/FiltersContext";
import { ThemeProvider } from "next-themes";
import Footer from "@src/components/Footer";
import { initAnalytics } from "../../lib/firebase";
import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// tiny client island declared right here
function AnalyticsInit() {
  "use client"; // ← turns just this function into a Client Component
  React.useEffect(() => {
    initAnalytics(); // fire-and-forget
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
    <UserProvider>
      <FiltersProvider>
        <GoogleOAuthProvider clientId={CLIENT_ID}>
          <html lang="en" suppressHydrationWarning>
            <head>
              <title>Yale IMs</title>
              <link rel="icon" href="/favicon.ico" />
              <meta property="og:title" content="Yale IMs" />
            </head>
            <body
              className={`${inter.className} min-h-screen w-full grid grid-cols-[0.16fr_0.84fr]`}
            >
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
              >
                <div>
                  <AnalyticsInit />
                  <NavBar />
                </div>
                <div className="">
                  {children}
                  <Footer />
                </div>
                <ToastContainer />
              </ThemeProvider>
            </body>
          </html>
        </GoogleOAuthProvider>
      </FiltersProvider>
    </UserProvider>
  );
}
