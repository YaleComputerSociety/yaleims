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

    useEffect(() => {
      const hasAccess = user && allowedRoles.includes(user.role);

      if (!loading && !hasAccess) {
        router.push("/"); // push to home page
      }
    }, [loading, user, router]);

    if (loading) {
      return <LoadingScreen />;
    }

    const hasAccess = user && allowedRoles.includes(user.role);
    return hasAccess ? <WrappedComponent {...props} /> : null;
  };

  ProtectedRoute.displayName = `withRoleProtectedRoute(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return ProtectedRoute;
};

export default withRoleProtectedRoute;
