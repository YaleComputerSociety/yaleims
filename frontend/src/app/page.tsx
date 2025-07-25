"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AAHomeComponent from "@src/components/Home/AAHomeComponent";
import LoadingScreen from "@src/components/LoadingScreen";
import { useUser } from "@src/context/UserContext";

const HomePage: React.FC = () => {
  const { user, loading } = useUser();
  const router = useRouter();

  const unauthenticated = !loading && !user;

  useEffect(() => {
    if (unauthenticated) router.replace("/dashboard");
  }, [unauthenticated, router]);

  if (loading || unauthenticated) return <LoadingScreen />;

  return (
    <div className="min-h-screen">
      <AAHomeComponent />
    </div>
  );
};

export default HomePage;
