// to replace withProtectedRoute later
"use client";

import React, { useEffect, ComponentType } from "react";
import { hasRole, useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/layout/LoadingScreen";

/**
 * Higher-order component to protect routes based on user roles
 * @param WrappedComponent component to lock behind role permissions
 * @param allowedRoles array of strings for roles allowed to view the component
 * @returns protected route
 */
const withRoleProtectedRoute = <P extends {}>(
  WrappedComponent: ComponentType<P>,
  allowedRoles: string[]
) => {
  const ProtectedRoute: React.FC<P> = (props) => {
    const { viewer, loading } = useSession();
    const router = useRouter();

    const hasAccess = hasRole(viewer, ...allowedRoles);
    useEffect(() => {
      if (!loading && !hasAccess) {
        router.push("/"); // push to home page
      }
    }, [loading, hasAccess, router]);

    if (loading) {
      return <LoadingScreen />;
    }
    return hasAccess ? <WrappedComponent {...props} /> : null;
  };

  ProtectedRoute.displayName = `withRoleProtectedRoute(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return ProtectedRoute;
};

export default withRoleProtectedRoute;
