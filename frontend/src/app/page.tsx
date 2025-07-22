"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AAHomeComponent from "@src/components/Home/AAHomeComponent";
import { useUser } from "@src/context/UserContext";
import LoadingScreen from '@src/components/LoadingScreen';
import { useState } from 'react';

const HomePage: React.FC = () => {
  const { user } = useUser();

  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  if (!user) return <LoadingScreen />;

  return (
    <div className="min-h-screen">
      <AAHomeComponent />
    </div>
  );
};

export default HomePage;
