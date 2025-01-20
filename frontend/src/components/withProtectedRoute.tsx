// src/components/withProtectedRoute.tsx
import React, { useEffect, ComponentType } from "react";
import { useUser } from "@src/context/UserContext";
import { useRouter } from "next/navigation";
import LoadingScreen from "./LoadingScreen";

// redirect user to home page if not logged in and not admin
const withProtectedRoute = <P extends {}>(
  WrappedComponent: ComponentType<P>
) => {
  const ProtectedRoute: React.FC<P> = (props) => {
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

  ProtectedRoute.displayName = `withProtectedRoute(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return ProtectedRoute;
};

export default withProtectedRoute;
