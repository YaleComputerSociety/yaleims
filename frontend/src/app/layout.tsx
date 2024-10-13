"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "../components/NavBar" // Adjust path accordingly
import { GoogleOAuthProvider } from '@react-oauth/google';

const CLIENT_ID = '683055403263-8nk173ne786mjmhicqmuod2ufmcdnnec.apps.googleusercontent.com';
const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
    <html lang="en">
      <body className={inter.className}>
        <NavBar />
        <div className="mb-10"></div>
        {children}        
      </body>
    </html>
    </GoogleOAuthProvider>
  );
}
