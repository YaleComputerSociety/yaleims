import React, { useEffect } from "react";
import { useUser } from "@src/context/UserContext";
import { useRouter } from "next/navigation";
import LoadingScreen from "./LoadingScreen";

// redirect user to home page if not logged in and not admin
const withProtectedRoute = (WrappedComponent: React.FC) => {
  interface WithProtectedRouteProps {
    [key: string]: any;
  }

  return (props: WithProtectedRouteProps) => {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
      if (!loading && (!user || user?.role !== "admin")) {
        router.push("/");
        return;
      }
    }, [loading, user, router]);

    if (loading) {
      return <LoadingScreen />;
    }

    return user ? <WrappedComponent {...props} /> : null;
  };
};

export default withProtectedRoute;
