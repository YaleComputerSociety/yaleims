"use client";

import { useEffect } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useAuth from "../hooks/useAuth";
import Leaderboard from '../components/Home/Leaderboard';
import LoadingScreen from '../components/LoadingScreen';


const HomePage: React.FC = () => {
  const { saveUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const user = searchParams.get("netid");

      document.title = "Yale IMs";

      const handleToken = async () => {
          if (user && saveUser) {
              await saveUser(user); // Ensure token is saved properly
          }
      };
      handleToken();

      // Redirect to login if token is not present
      if (!user) {
          const currentUrl = window.location.toString(); // Current page URL
          const redirectUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/login?redir=${encodeURIComponent(currentUrl)}`;
          router.push(redirectUrl); // Use router for redirection
      }
  }, [router, saveUser]);

  return (
      <Suspense fallback={<LoadingScreen />}>
          <div className="min-h-screen bg-blue-100 p-8">
              <br />
              <Leaderboard />
          </div>
      </Suspense>
  );
};

export default HomePage;
