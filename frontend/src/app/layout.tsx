"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "@src/components/NavBar";
import { useEffect } from "react";
import { UserProvider } from "@src/context/UserContext";
import FiltersProvider from "@src/context/FiltersContext";
import { ThemeProvider } from "next-themes";
import Footer from "@src/components/Footer";
import { initAnalytics } from "../../lib/firebase";
import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { SeasonProvider } from "@src/context/SeasonContext";
import { NavbarProvider, useNavbar } from "@src/context/NavbarContext";

const inter = Inter({ subsets: ["latin"] });

function InnerLayout({ children }: { children: React.ReactNode }) {
  const { collapsed } = useNavbar();
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <div className={`flex flex-col transition-all duration-200 min-h-screen md:grid ${collapsed ? "md:grid-cols-[0.05fr_0.95fr]" : "md:grid-cols-[0.16fr_0.84fr]"}`}>
      <div className="transition-all duration-200">
        <NavBar />
      </div>
      <div className="transition-all duration-200">
        <SeasonProvider>{children}</SeasonProvider>                      
        <Footer />
      </div>    
      <ToastContainer />      
    </div>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode;}>) {
  return (
    <UserProvider>      
      <FiltersProvider>
        <NavbarProvider>
          <html lang="en" suppressHydrationWarning>
            <head>
              <title>Yale IMs</title>
              <link rel="icon" href="/favicon.ico" />
              <meta property="og:title" content="Yale IMs" />
            </head>
            <body className={`${inter.className}`}>
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <InnerLayout>{children}</InnerLayout>
              </ThemeProvider>               
            </body>
          </html>
        </NavbarProvider>
      </FiltersProvider>
    </UserProvider>
  );
}
