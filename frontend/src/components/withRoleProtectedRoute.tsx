// to replace withProtectedRoute later
"use client";

import React, { useEffect, ComponentType } from "react";
import { useUser } from "@src/context/UserContext";
import { useRouter } from "next/navigation";
import LoadingScreen from "./LoadingScreen";

const withRoleProtectedRoute = <P extends {}>(
  WrappedComponent: ComponentType<P>,
  allowedRoles: string[]
) => {
  const ProtectedRoute: React.FC<P> = (props) => {
    const { user, loading } = useUser();
    const router = useRouter();

    const setRoles = new Set(user?.mRoles || []);
    useEffect(() => {
      const hasAccess = allowedRoles.some(item => setRoles.has(item));
      if (!loading && !hasAccess) {
        router.push("/"); // push to home page
      }
    }, [loading, user, router]);

    if (loading) {
      return <LoadingScreen />;
    }
    const hasAccess = allowedRoles.some(item => setRoles.has(item));
    return hasAccess ? <WrappedComponent {...props} /> : null;
  };

  ProtectedRoute.displayName = `withRoleProtectedRoute(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return ProtectedRoute;
};

export default withRoleProtectedRoute;
