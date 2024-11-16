"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useAuth from "../hooks/useAuth";
import Leaderboard from '../components/Home/Leaderboard';
import LoadingScreen from '../components/LoadingScreen';


const HomePage: React.FC = () => {
  const searchParams = useSearchParams();
  const user = searchParams?.get("netid");
  const { saveUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    document.title = "Yale IMs";

    // Save token if it exists in the URL
    const handleToken = async () => {
      if (user && saveUser) {
        await saveUser(user); // Ensure token is saved properly
      }
    };
    handleToken();
  }, [user, saveUser]);

  useEffect(() => {
    // Redirect to login if token is not present
    if (!user) {
      const currentUrl = window.location.toString(); // Current page URL
      const redirectUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/login?redir=${encodeURIComponent(currentUrl)}`;
      router.push(redirectUrl); // Use router for redirection
    }
  }, [user, router]);

  return !user ? (
    <LoadingScreen />
  ) : (
    <div className="min-h-screen bg-blue-100 p-8">
      <br />
      <Leaderboard />
    </div>
  );
};

export default HomePage;
